package expo.modules.multicamcapture

import android.content.Context
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.Paint
import android.graphics.RectF
import android.graphics.SurfaceTexture
import android.os.Bundle
import android.view.MotionEvent
import android.view.ScaleGestureDetector
import android.view.Surface
import android.view.TextureView
import android.view.View
import android.view.ViewConfiguration
import android.view.accessibility.AccessibilityNodeInfo
import expo.modules.kotlin.AppContext
import expo.modules.kotlin.views.ExpoView
import kotlin.math.abs

class CaptureSurfaceView(context: Context, appContext: AppContext) : ExpoView(context, appContext), TextureView.SurfaceTextureListener {
  private val engine = CaptureEngines.get(appContext)
  private val texture = TextureView(context).apply { surfaceTextureListener = this@CaptureSurfaceView }
  private var surface: Surface? = null
  private var downX = 0f
  private var downY = 0f
  private var moved = false
  private var scaled = false
  private var dragging = false
  private var dragFrame = RectF()
  private var pinchSlot = 0
  private var pinchFactor = 1f
  private var focusX = -1f
  private var focusY = -1f
  private val paint = Paint(Paint.ANTI_ALIAS_FLAG).apply { color = Color.YELLOW; style = Paint.Style.STROKE; strokeWidth = resources.displayMetrics.density * 1.5f }
  private val overlay = object : View(context) {
    override fun onDraw(canvas: Canvas) {
      if (focusX >= 0) {
        val r = resources.displayMetrics.density * 30
        canvas.drawRoundRect(focusX - r, focusY - r, focusX + r, focusY + r, 6f, 6f, paint)
      }
    }
  }
  private val scale = ScaleGestureDetector(context, object : ScaleGestureDetector.SimpleOnScaleGestureListener() {
    override fun onScaleBegin(detector: ScaleGestureDetector): Boolean {
      pinchSlot = slotAt(detector.focusX, detector.focusY)
      pinchFactor = engine.zoomFactor(pinchSlot)
      scaled = true; dragging = false; engine.dragPip(null)
      return true
    }
    override fun onScale(detector: ScaleGestureDetector): Boolean {
      pinchFactor *= detector.scaleFactor
      engine.zoom(pinchSlot, pinchFactor)
      return true
    }
  })
  init {
    setBackgroundColor(Color.BLACK)
    addView(texture); addView(overlay)
    isFocusable = true
    importantForAccessibility = IMPORTANT_FOR_ACCESSIBILITY_YES
    contentDescription = "Camera preview. Pinch to zoom. Tap to focus. Tap the inset to swap cameras."
  }
  override fun onLayout(changed: Boolean, left: Int, top: Int, right: Int, bottom: Int) {
    texture.layout(0, 0, width, height); overlay.layout(0, 0, width, height)
  }
  override fun onSurfaceTextureAvailable(source: SurfaceTexture, width: Int, height: Int) {
    surface = Surface(source); engine.attach(surface, width, height)
  }
  override fun onSurfaceTextureSizeChanged(source: SurfaceTexture, width: Int, height: Int) { engine.attach(surface, width, height) }
  override fun onSurfaceTextureUpdated(source: SurfaceTexture) {}
  override fun onSurfaceTextureDestroyed(source: SurfaceTexture): Boolean {
    val current = surface; surface = null
    if (engine.detach(current)) { current?.release(); return true }
    // egl may still hold the surface, so it is released only after the camera thread lets go of it
    if (!engine.handler.post { current?.release(); source.release() }) { current?.release(); return true }
    return false
  }
  private fun pane(x: Float, y: Float): RectF {
    return when (engine.preset?.mode) {
      "pip" -> PipLayout.frame(width.toFloat(), height.toFloat(), engine.corner).let {
        if (it.contains(x, y)) it else RectF(0f, 0f, width.toFloat(), height.toFloat())
      }
      "split", "discrete" -> if (y < height / 2f) RectF(0f, 0f, width.toFloat(), height / 2f)
        else RectF(0f, height / 2f, width.toFloat(), height.toFloat())
      else -> RectF(0f, 0f, width.toFloat(), height.toFloat())
    }
  }
  private fun slotAt(x: Float, y: Float): Int {
    if (engine.preset?.mode == "single") return 0
    val trailing = if (engine.preset?.mode == "pip") PipLayout.frame(width.toFloat(), height.toFloat(), engine.corner).contains(x, y) else y >= height / 2f
    return if (trailing xor engine.swapped) 1 else 0
  }
  override fun onTouchEvent(event: MotionEvent): Boolean {
    if (width == 0 || height == 0) return false
    scale.onTouchEvent(event)
    when (event.actionMasked) {
      MotionEvent.ACTION_DOWN -> {
        parent?.requestDisallowInterceptTouchEvent(true)
        downX = event.x; downY = event.y; moved = false; scaled = false
        dragFrame = PipLayout.frame(width.toFloat(), height.toFloat(), engine.corner)
        dragging = engine.preset?.mode == "pip" && dragFrame.contains(downX, downY)
      }
      MotionEvent.ACTION_MOVE -> {
        if (abs(event.x - downX) + abs(event.y - downY) > ViewConfiguration.get(context).scaledTouchSlop) moved = true
        if (dragging && moved && !scaled) {
          val margin = minOf(width, height) * .04f
          val x = (dragFrame.left + event.x - downX).coerceIn(margin, maxOf(margin, width - margin - dragFrame.width()))
          val y = (dragFrame.top + event.y - downY).coerceIn(margin, maxOf(margin, height - margin - dragFrame.height()))
          engine.dragPip(RectF(x / width, y / height, (x + dragFrame.width()) / width, (y + dragFrame.height()) / height))
        }
      }
      MotionEvent.ACTION_UP, MotionEvent.ACTION_CANCEL -> {
        if (dragging && moved && !scaled) {
          val cx = dragFrame.centerX() + event.x - downX
          val cy = dragFrame.centerY() + event.y - downY
          engine.movePip((if (cx >= width / 2f) 1 else 0) + (if (cy >= height / 2f) 2 else 0))
        } else if (!moved && !scaled && event.actionMasked == MotionEvent.ACTION_UP) {
          performClick()
          if (dragging) engine.swap() else {
            val pane = pane(event.x, event.y)
            engine.focus(slotAt(event.x, event.y), (event.x - pane.left) / pane.width(), (event.y - pane.top) / pane.height(), pane.width() / pane.height())
            focusX = event.x; focusY = event.y; overlay.invalidate()
            overlay.removeCallbacks(clearFocus); overlay.postDelayed(clearFocus, 1000)
          }
        }
        if (!dragging || !moved || scaled) engine.dragPip(null)
        dragging = false
        parent?.requestDisallowInterceptTouchEvent(false)
      }
    }
    return true
  }
  private val clearFocus = Runnable { focusX = -1f; overlay.invalidate() }
  override fun performClick(): Boolean { super.performClick(); return true }
  override fun onInitializeAccessibilityNodeInfo(info: AccessibilityNodeInfo) {
    super.onInitializeAccessibilityNodeInfo(info)
    if (engine.preset?.mode in listOf("pip", "split")) info.addAction(AccessibilityNodeInfo.AccessibilityAction(0x01020001, "Swap cameras"))
    if (engine.preset?.mode == "pip") listOf("top left", "top right", "bottom left", "bottom right").forEachIndexed { index, name ->
      info.addAction(AccessibilityNodeInfo.AccessibilityAction(0x01020002 + index, "Move inset to $name"))
    }
  }
  override fun performAccessibilityAction(action: Int, arguments: Bundle?): Boolean {
    if (action == 0x01020001 && engine.preset?.mode in listOf("pip", "split")) { engine.swap(); return true }
    if (action in 0x01020002..0x01020005 && engine.preset?.mode == "pip") { engine.movePip(action - 0x01020002); return true }
    return super.performAccessibilityAction(action, arguments)
  }
}
