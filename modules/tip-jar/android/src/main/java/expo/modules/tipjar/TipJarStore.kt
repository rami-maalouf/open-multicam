package expo.modules.tipjar

import android.util.Log
import kotlinx.coroutines.CompletableDeferred
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.launch
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock

internal data class SupportPurchase(
  val token: String,
  val completed: Boolean,
  val acknowledged: Boolean,
)

internal enum class LaunchResult { STARTED, CANCELLED, ALREADY_OWNED }

internal interface TipBilling {
  var onUpdate: ((Result<List<SupportPurchase>>) -> Unit)?
  suspend fun purchases(): List<SupportPurchase>
  suspend fun price(): String?
  suspend fun acknowledge(token: String)
  fun launch(): LaunchResult
  fun close()
}

internal class TipJarStore(
  private val billing: TipBilling,
  private val scope: CoroutineScope,
  private val onChange: () -> Unit,
) {
  private val purchaseLock = Mutex()
  private val acknowledgementLock = Mutex()
  private val acknowledgedTokens = mutableSetOf<String>()
  private var pendingResult: CompletableDeferred<String>? = null
  private var lastSupported: Boolean? = null

  init {
    billing.onUpdate = { update ->
      scope.launch {
        try {
          val purchases = if (update.exceptionOrNull() is PurchaseAlreadyOwned) billing.purchases() else update.getOrThrow()
          if (purchases.isNotEmpty()) {
            acknowledge(purchases)
            pendingResult?.complete(if (purchases.any { it.completed }) "purchased" else "pending")
            onChange()
          } else {
            pendingResult?.completeExceptionally(IllegalStateException("Google Play could not verify the purchase. Please try Restore Purchase."))
          }
        } catch (error: Exception) {
          if (error is PurchaseCancelled) pendingResult?.complete("cancelled")
          else pendingResult?.completeExceptionally(error)
        }
      }
    }
  }

  suspend fun status(): Map<String, Any> {
    val purchases = billing.purchases()
    acknowledge(purchases)
    val supported = purchases.any { it.completed }
    val price = try {
      billing.price()
    } catch (error: Exception) {
      if (error is kotlinx.coroutines.CancellationException || !supported) throw error
      null
    }
    val previous = lastSupported
    lastSupported = supported
    if (previous != null && previous != supported) onChange()
    return buildMap {
      put("available", price != null)
      put("hasSupported", supported)
      if (price != null) put("displayPrice", price)
    }
  }

  suspend fun purchase(): String {
    check(purchaseLock.tryLock()) { "A purchase is already in progress." }
    try {
      val purchases = billing.purchases()
      acknowledge(purchases)
      if (purchases.any { it.completed }) return "purchased"
      if (purchases.isNotEmpty()) return "pending"
      check(billing.price() != null) {
        "Donations are temporarily unavailable. All camera features are still free."
      }
      val result = CompletableDeferred<String>()
      pendingResult = result
      return when (billing.launch()) {
        LaunchResult.STARTED -> result.await()
        LaunchResult.CANCELLED -> "cancelled"
        LaunchResult.ALREADY_OWNED -> {
          val owned = billing.purchases()
          acknowledge(owned)
          when {
            owned.any { it.completed } -> "purchased"
            owned.isNotEmpty() -> "pending"
            else -> error("Google Play could not verify the purchase. Please try Restore Purchase.")
          }
        }
      }
    } finally {
      pendingResult = null
      purchaseLock.unlock()
    }
  }

  suspend fun restore(): Map<String, Any> = status()

  fun refresh() {
    scope.launch {
      try {
        status()
      } catch (error: Exception) {
        if (error is kotlinx.coroutines.CancellationException) throw error
      }
    }
  }

  fun close() {
    billing.onUpdate = null
    pendingResult?.cancel()
    billing.close()
  }

  // the charge has already succeeded when this runs, so a failed acknowledgement must not turn it into
  // an error. it is retried on the next status, restore or foreground refresh, well within the three
  // days google play waits before refunding an unacknowledged purchase.
  private suspend fun acknowledge(purchases: List<SupportPurchase>) {
    acknowledgementLock.withLock {
      for (purchase in purchases) {
        if (purchase.completed) {
          check(purchase.token.isNotBlank()) { "Google Play returned an invalid purchase token." }
          if (!purchase.acknowledged && purchase.token !in acknowledgedTokens) {
            try {
              billing.acknowledge(purchase.token)
              acknowledgedTokens.add(purchase.token)
            } catch (error: Exception) {
              if (error is kotlinx.coroutines.CancellationException) throw error
              Log.w("TipJar", "Acknowledgement failed and will be retried.", error)
            }
          }
        }
      }
    }
  }
}

internal class PurchaseCancelled : Exception()
internal class PurchaseAlreadyOwned : Exception()
