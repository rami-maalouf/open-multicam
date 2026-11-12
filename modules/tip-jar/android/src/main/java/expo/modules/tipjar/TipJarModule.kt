package expo.modules.tipjar

import expo.modules.kotlin.Promise
import expo.modules.kotlin.functions.Queues
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.cancel
import kotlinx.coroutines.launch

class TipJarModule : Module() {
  private var scope: CoroutineScope? = null
  private var store: TipJarStore? = null

  override fun definition() = ModuleDefinition {
    Name("TipJar")
    Events("onChange")

    OnCreate {
      val context = requireNotNull(appContext.reactContext) { "React context is unavailable." }
      val moduleScope = CoroutineScope(SupervisorJob() + Dispatchers.Main.immediate)
      scope = moduleScope
      store = TipJarStore(PlayTipBilling(context) { appContext.currentActivity }, moduleScope) {
        sendEvent("onChange", emptyMap<String, Any>())
      }
      store?.refresh()
    }

    AsyncFunction("getStatus") { promise: Promise ->
      request(promise) { it.status() }
    }.runOnQueue(Queues.MAIN)

    AsyncFunction("purchase") { promise: Promise ->
      request(promise) { it.purchase() }
    }.runOnQueue(Queues.MAIN)

    AsyncFunction("restore") { promise: Promise ->
      request(promise) { it.restore() }
    }.runOnQueue(Queues.MAIN)

    OnActivityEntersForeground { store?.refresh() }

    OnDestroy {
      store?.close()
      store = null
      scope?.cancel()
      scope = null
    }
  }

  private fun request(promise: Promise, operation: suspend (TipJarStore) -> Any) {
    val currentStore = store
    val currentScope = scope
    if (currentStore == null || currentScope == null) {
      promise.reject("ERR_TIP_JAR_UNAVAILABLE", "The Google Play connection is unavailable.", null)
      return
    }
    currentScope.launch {
      try {
        promise.resolve(operation(currentStore))
      } catch (error: Exception) {
        promise.reject("ERR_TIP_JAR", error.message ?: "Google Play could not complete the request.", error)
      }
    }
  }
}
