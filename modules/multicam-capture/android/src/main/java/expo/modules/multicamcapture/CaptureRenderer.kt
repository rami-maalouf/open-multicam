package expo.modules.multicamcapture

import android.graphics.RectF
import android.graphics.SurfaceTexture
import android.opengl.*
import android.os.Handler
import android.view.Surface
import java.nio.ByteBuffer
import java.nio.ByteOrder

// all egl objects and camera textures belong to the camera handler thread.
internal class CaptureRenderer(private val handler: Handler, private val onFailure: (Throwable) -> Unit) {
  private val display = EGL14.eglGetDisplay(EGL14.EGL_DEFAULT_DISPLAY)
  private val config: EGLConfig
  private val context: EGLContext
  private val parking: EGLSurface
  private val program: Int
  private val positions: Int
  private val textureCoordinates: Int
  private val transformLocation: Int
  private val imageLocation: Int
  private val paneLocation: Int
  private val radiusLocation: Int
  private val transform = FloatArray(16)
  private val combined = FloatArray(16)
  private val vertices = ByteBuffer.allocateDirect(8 * 4).order(ByteOrder.nativeOrder()).asFloatBuffer().apply {
    put(floatArrayOf(-1f, -1f, 1f, -1f, -1f, 1f, 1f, 1f)); position(0)
  }
  private val coordinates = ByteBuffer.allocateDirect(8 * 4).order(ByteOrder.nativeOrder()).asFloatBuffer().apply {
    put(floatArrayOf(0f, 0f, 1f, 0f, 0f, 1f, 1f, 1f)); position(0)
  }
  data class Feed(val texture: Int, val source: SurfaceTexture, val surface: Surface,
    val rotation: Int, val front: Boolean, val matrix: FloatArray = FloatArray(16), var ready: Boolean = false)
  private val feeds = mutableListOf<Feed>()
  private var preview: EGLSurface? = null
  private var previewWidth = 0
  private var previewHeight = 0
  private var targets = emptyList<EGLSurface>()
  var preset: Preset? = null
  var swapped = false
  var corner = 1
  var draggedInset: RectF? = null
  private var lastTimestamp = 0L
  var encodedFrames = 0L
    private set
  var droppedFrames = 0L
    private set
  var firstFrameNs = 0L
    private set

  init {
    check(EGL14.eglInitialize(display, IntArray(2), 0, IntArray(2), 1)) { "EGL initialization failed." }
    val configs = arrayOfNulls<EGLConfig>(1)
    val count = IntArray(1)
    check(EGL14.eglChooseConfig(display, intArrayOf(EGL14.EGL_RENDERABLE_TYPE, EGL14.EGL_OPENGL_ES2_BIT,
      EGL14.EGL_SURFACE_TYPE, EGL14.EGL_WINDOW_BIT or EGL14.EGL_PBUFFER_BIT,
      EGL14.EGL_RED_SIZE, 8, EGL14.EGL_GREEN_SIZE, 8, EGL14.EGL_BLUE_SIZE, 8,
      0x3142, 1, EGL14.EGL_NONE), 0, configs, 0, 1, count, 0) && count[0] > 0)
    config = configs[0]!!
    context = EGL14.eglCreateContext(display, config, EGL14.EGL_NO_CONTEXT,
      intArrayOf(EGL14.EGL_CONTEXT_CLIENT_VERSION, 2, EGL14.EGL_NONE), 0)
    check(context != EGL14.EGL_NO_CONTEXT)
    parking = EGL14.eglCreatePbufferSurface(display, config,
      intArrayOf(EGL14.EGL_WIDTH, 1, EGL14.EGL_HEIGHT, 1, EGL14.EGL_NONE), 0)
    current(parking)
    fun shader(type: Int, source: String): Int {
      val id = GLES20.glCreateShader(type)
      GLES20.glShaderSource(id, source); GLES20.glCompileShader(id)
      val status = IntArray(1); GLES20.glGetShaderiv(id, GLES20.GL_COMPILE_STATUS, status, 0)
      check(status[0] != 0) { GLES20.glGetShaderInfoLog(id) }
      return id
    }
    val vertex = shader(GLES20.GL_VERTEX_SHADER, "attribute vec4 position; attribute vec4 tex; uniform mat4 transform; varying vec2 uv; varying vec2 localUv; void main(){gl_Position=position;uv=(transform*tex).xy;localUv=tex.xy;}")
    val fragment = shader(GLES20.GL_FRAGMENT_SHADER, "#extension GL_OES_EGL_image_external : require\nprecision mediump float; uniform samplerExternalOES image; uniform vec2 paneSize; uniform float radius; varying vec2 uv; varying vec2 localUv; void main(){if(radius>0.0){vec2 q=abs((localUv-0.5)*paneSize)-(paneSize*0.5-vec2(radius));if(length(max(q,vec2(0.0)))+min(max(q.x,q.y),0.0)>radius)discard;}gl_FragColor=texture2D(image,uv);}")
    program = GLES20.glCreateProgram(); GLES20.glAttachShader(program, vertex); GLES20.glAttachShader(program, fragment)
    GLES20.glLinkProgram(program)
    val linked = IntArray(1); GLES20.glGetProgramiv(program, GLES20.GL_LINK_STATUS, linked, 0)
    check(linked[0] != 0) { GLES20.glGetProgramInfoLog(program) }
    GLES20.glDeleteShader(vertex); GLES20.glDeleteShader(fragment)
    positions = GLES20.glGetAttribLocation(program, "position")
    textureCoordinates = GLES20.glGetAttribLocation(program, "tex")
    transformLocation = GLES20.glGetUniformLocation(program, "transform")
    imageLocation = GLES20.glGetUniformLocation(program, "image")
    paneLocation = GLES20.glGetUniformLocation(program, "paneSize")
    radiusLocation = GLES20.glGetUniformLocation(program, "radius")
  }
  private fun current(surface: EGLSurface) {
    check(EGL14.eglMakeCurrent(display, surface, surface, context)) { "EGL context lost." }
  }
  private fun window(surface: Surface): EGLSurface = EGL14.eglCreateWindowSurface(display, config, surface, intArrayOf(EGL14.EGL_NONE), 0).also {
    check(it != EGL14.EGL_NO_SURFACE) { "Encoder or preview surface unavailable." }
  }
  fun attachPreview(surface: Surface?, width: Int, height: Int) {
    current(parking)
    preview?.let { EGL14.eglDestroySurface(display, it) }; preview = null
    previewWidth = width; previewHeight = height
    if (surface != null) preview = window(surface)
  }
  fun createFeed(rotation: Int, front: Boolean): Surface {
    current(parking)
    val texture = IntArray(1); GLES20.glGenTextures(1, texture, 0)
    GLES20.glBindTexture(GLES11Ext.GL_TEXTURE_EXTERNAL_OES, texture[0])
    GLES20.glTexParameteri(GLES11Ext.GL_TEXTURE_EXTERNAL_OES, GLES20.GL_TEXTURE_MIN_FILTER, GLES20.GL_LINEAR)
    GLES20.glTexParameteri(GLES11Ext.GL_TEXTURE_EXTERNAL_OES, GLES20.GL_TEXTURE_MAG_FILTER, GLES20.GL_LINEAR)
    GLES20.glTexParameteri(GLES11Ext.GL_TEXTURE_EXTERNAL_OES, GLES20.GL_TEXTURE_WRAP_S, GLES20.GL_CLAMP_TO_EDGE)
    GLES20.glTexParameteri(GLES11Ext.GL_TEXTURE_EXTERNAL_OES, GLES20.GL_TEXTURE_WRAP_T, GLES20.GL_CLAMP_TO_EDGE)
    val source = SurfaceTexture(texture[0]); source.setDefaultBufferSize(1920, 1080)
    val feed = Feed(texture[0], source, Surface(source), rotation, front)
    feeds += feed
    source.setOnFrameAvailableListener({
      try {
        current(parking); source.updateTexImage(); source.getTransformMatrix(feed.matrix); feed.ready = true
        if (feed === feeds.firstOrNull()) render(System.nanoTime())
      } catch (error: Throwable) { onFailure(error) }
    }, handler)
    return feed.surface
  }
  fun startEncoding(surfaces: List<Surface>) {
    current(parking)
    val created = mutableListOf<EGLSurface>()
    try { surfaces.forEach { created += window(it) } }
    catch (error: Throwable) { created.forEach { EGL14.eglDestroySurface(display, it) }; throw error }
    targets = created; encodedFrames = 0; droppedFrames = 0; firstFrameNs = 0; lastTimestamp = 0
  }
  fun stopEncoding() {
    current(parking); targets.forEach { EGL14.eglDestroySurface(display, it) }; targets = emptyList()
  }
  private fun render(timestamp: Long) {
    val p = preset ?: return
    if (feeds.size != p.cameraIds.size || feeds.any { !it.ready }) return
    preview?.let { target ->
      current(target); draw(previewWidth, previewHeight, null)
      if (!EGL14.eglSwapBuffers(display, target)) {
        current(parking); EGL14.eglDestroySurface(display, target); preview = null
      }
    }
    if (targets.isEmpty()) return
    if (lastTimestamp != 0L && timestamp - lastTimestamp < 1_000_000_000L / p.frameRate * 8 / 10) return
    if (lastTimestamp != 0L) droppedFrames += maxOf(0L, ((timestamp - lastTimestamp) * p.frameRate + 500_000_000L) / 1_000_000_000L - 1)
    lastTimestamp = timestamp
    if (firstFrameNs == 0L) firstFrameNs = timestamp
    targets.forEachIndexed { index, target ->
      current(target); draw(p.width, p.height, if (p.mode == "discrete") index else null)
      EGLExt.eglPresentationTimeANDROID(display, target, timestamp)
      check(EGL14.eglSwapBuffers(display, target)) { "The recording encoder stopped accepting frames." }
    }
    encodedFrames++
    current(parking)
  }
  private fun draw(width: Int, height: Int, discreteSlot: Int?) {
    if (width <= 0 || height <= 0) return
    GLES20.glViewport(0, 0, width, height)
    GLES20.glClearColor(0f, 0f, 0f, 1f); GLES20.glClear(GLES20.GL_COLOR_BUFFER_BIT)
    val p = preset ?: return
    val whole = RectF(0f, 0f, width.toFloat(), height.toFloat())
    if (discreteSlot != null || p.mode == "single") {
      drawFeed(discreteSlot ?: 0, whole, width, height); return
    }
    val first = if (swapped && p.mode != "discrete") 1 else 0
    val second = 1 - first
    if (p.mode == "pip") {
      drawFeed(first, whole, width, height)
      val inset = draggedInset?.let { RectF(it.left * width, it.top * height, it.right * width, it.bottom * height) }
        ?: PipLayout.frame(width.toFloat(), height.toFloat(), corner)
      drawFeed(second, inset, width, height, rounded = true)
    } else {
      drawFeed(first, RectF(0f, 0f, width.toFloat(), height / 2f), width, height)
      drawFeed(second, RectF(0f, height / 2f, width.toFloat(), height.toFloat()), width, height)
    }
  }
  private fun drawFeed(slot: Int, pane: RectF, width: Int, height: Int, rounded: Boolean = false) {
    val feed = feeds.getOrNull(slot) ?: return
    GLES20.glViewport(pane.left.toInt(), (height - pane.bottom).toInt(), pane.width().toInt(), pane.height().toInt())
    GLES20.glUseProgram(program)
    GLES20.glUniform2f(paneLocation, pane.width(), pane.height())
    GLES20.glUniform1f(radiusLocation, if (rounded) minOf(pane.width(), pane.height()) * .08f else 0f)
    GLES20.glEnableVertexAttribArray(positions); GLES20.glEnableVertexAttribArray(textureCoordinates)
    vertices.position(0); coordinates.position(0)
    GLES20.glVertexAttribPointer(positions, 2, GLES20.GL_FLOAT, false, 0, vertices)
    GLES20.glVertexAttribPointer(textureCoordinates, 2, GLES20.GL_FLOAT, false, 0, coordinates)
    val rotation = ((feed.rotation % 360) + 360) % 360
    val sourceAspect = if (rotation % 180 == 0) 1920f / 1080 else 1080f / 1920
    val paneAspect = pane.width() / pane.height()
    Matrix.setIdentityM(transform, 0)
    Matrix.translateM(transform, 0, .5f, .5f, 0f)
    Matrix.rotateM(transform, 0, rotation.toFloat(), 0f, 0f, 1f)
    // front-facing capture is mirrored consistently in preview and saved video.
    Matrix.scaleM(transform, 0, if (feed.front) -1f else 1f, 1f, 1f)
    Matrix.scaleM(transform, 0, if (paneAspect < sourceAspect) paneAspect / sourceAspect else 1f,
      if (paneAspect > sourceAspect) sourceAspect / paneAspect else 1f, 1f)
    Matrix.translateM(transform, 0, -.5f, -.5f, 0f)
    Matrix.multiplyMM(combined, 0, feed.matrix, 0, transform, 0)
    GLES20.glUniformMatrix4fv(transformLocation, 1, false, combined, 0)
    GLES20.glActiveTexture(GLES20.GL_TEXTURE0); GLES20.glBindTexture(GLES11Ext.GL_TEXTURE_EXTERNAL_OES, feed.texture)
    GLES20.glUniform1i(imageLocation, 0)
    GLES20.glDrawArrays(GLES20.GL_TRIANGLE_STRIP, 0, 4)
  }
  fun clearFeeds() {
    current(parking)
    feeds.forEach { it.source.setOnFrameAvailableListener(null); it.surface.release(); it.source.release(); GLES20.glDeleteTextures(1, intArrayOf(it.texture), 0) }
    feeds.clear()
  }
  fun close() {
    stopEncoding(); clearFeeds(); attachPreview(null, 0, 0)
    GLES20.glDeleteProgram(program)
    EGL14.eglMakeCurrent(display, EGL14.EGL_NO_SURFACE, EGL14.EGL_NO_SURFACE, EGL14.EGL_NO_CONTEXT)
    EGL14.eglDestroySurface(display, parking); EGL14.eglDestroyContext(display, context); EGL14.eglTerminate(display)
  }
}
