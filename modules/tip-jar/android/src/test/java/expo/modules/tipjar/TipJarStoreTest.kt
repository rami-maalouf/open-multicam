package expo.modules.tipjar

import kotlinx.coroutines.async
import kotlinx.coroutines.test.runCurrent
import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

@OptIn(kotlinx.coroutines.ExperimentalCoroutinesApi::class)
class TipJarStoreTest {
  @Test
  fun purchaseIsAcknowledgedOnceAndRestoredWithoutAnotherCharge() = runTest {
    val billing = FakeBilling()
    val store = TipJarStore(billing, backgroundScope) {}
    assertEquals(mapOf("available" to true, "hasSupported" to false, "displayPrice" to "CA$4.99"), store.status())
    val purchase = async { store.purchase() }
    runCurrent()
    billing.owned = listOf(SupportPurchase("paid", true, false))
    billing.update()
    runCurrent()
    assertEquals("purchased", purchase.await())
    assertEquals(true, store.restore()["hasSupported"])
    assertEquals("purchased", store.purchase())
    assertEquals(listOf("paid"), billing.acknowledgements)
    assertEquals(1, billing.launches)
    val restoredStore = TipJarStore(billing, backgroundScope) {}
    assertEquals(true, restoredStore.restore()["hasSupported"])
  }

  @Test
  fun pendingPaymentOnlyGrantsSupportAfterApprovalAndRefundRemovesIt() = runTest {
    val billing = FakeBilling()
    var changes = 0
    val store = TipJarStore(billing, backgroundScope) { changes++ }
    store.status()
    val purchase = async { store.purchase() }
    runCurrent()
    billing.owned = listOf(SupportPurchase("pending", false, false))
    billing.update()
    runCurrent()
    assertEquals("pending", purchase.await())
    assertEquals(false, store.status()["hasSupported"])
    assertTrue(billing.acknowledgements.isEmpty())
    assertEquals("pending", store.purchase())
    assertEquals(1, billing.launches)
    billing.owned = listOf(SupportPurchase("pending", true, false))
    billing.update()
    runCurrent()
    assertEquals(true, store.status()["hasSupported"])
    billing.owned = emptyList()
    store.refresh()
    runCurrent()
    assertEquals(false, store.status()["hasSupported"])
    assertTrue(changes >= 3)
  }

  @Test
  fun cancellationAndFailureDoNotCreateSupportAndAllowRetry() = runTest {
    val billing = FakeBilling()
    val store = TipJarStore(billing, backgroundScope) {}
    val cancelled = async { store.purchase() }
    runCurrent()
    billing.onUpdate?.invoke(Result.failure(PurchaseCancelled()))
    runCurrent()
    assertEquals("cancelled", cancelled.await())
    val failed = async { runCatching { store.purchase() } }
    runCurrent()
    billing.onUpdate?.invoke(Result.failure(IllegalStateException("network error")))
    runCurrent()
    assertTrue(failed.await().isFailure)
    assertEquals(false, store.status()["hasSupported"])
    billing.launchResult = LaunchResult.CANCELLED
    assertEquals("cancelled", store.purchase())
  }

  @Test
  fun concurrentPurchaseIsRejectedAndAcknowledgementFailureIsRetriedOnRestore() = runTest {
    val billing = FakeBilling()
    val store = TipJarStore(billing, backgroundScope) {}
    val first = async { runCatching { store.purchase() } }
    runCurrent()
    assertTrue(runCatching { store.purchase() }.isFailure)
    billing.acknowledgementFails = true
    billing.owned = listOf(SupportPurchase("paid", true, false))
    billing.update()
    runCurrent()
    assertTrue(first.await().isFailure)
    billing.acknowledgementFails = false
    assertEquals(true, store.restore()["hasSupported"])
    assertEquals(listOf("paid"), billing.acknowledgements)
  }

  @Test
  fun missingProductOrStoreFailureNeverFabricatesAPurchase() = runTest {
    val billing = FakeBilling()
    val store = TipJarStore(billing, backgroundScope) {}
    billing.displayPrice = null
    assertEquals(mapOf("available" to false, "hasSupported" to false), store.status())
    assertTrue(runCatching { store.purchase() }.isFailure)
    assertEquals(0, billing.launches)
    billing.priceFails = true
    assertTrue(runCatching { store.status() }.isFailure)
    billing.owned = listOf(SupportPurchase("paid", true, true))
    val supported = store.status()
    assertEquals(true, supported["hasSupported"])
    assertEquals(false, supported["available"])
    assertFalse(supported.containsKey("displayPrice"))
  }

  @Test
  fun alreadyOwnedResponseRequiresActualOwnership() = runTest {
    val billing = FakeBilling()
    billing.launchResult = LaunchResult.ALREADY_OWNED
    val store = TipJarStore(billing, backgroundScope) {}
    assertTrue(runCatching { store.purchase() }.isFailure)
    billing.ownedOnLaunch = listOf(SupportPurchase("existing", true, false))
    assertEquals("purchased", store.purchase())
    assertEquals(listOf("existing"), billing.acknowledgements)
  }

  @Test
  fun closeDetachesUpdatesAndClosesBilling() = runTest {
    val billing = FakeBilling()
    val store = TipJarStore(billing, backgroundScope) {}
    val pending = async { runCatching { store.purchase() } }
    runCurrent()
    store.close()
    runCurrent()
    assertTrue(pending.await().isFailure)
    assertEquals(null, billing.onUpdate)
    assertTrue(billing.closed)
  }

  private class FakeBilling : TipBilling {
    override var onUpdate: ((Result<List<SupportPurchase>>) -> Unit)? = null
    var owned = emptyList<SupportPurchase>()
    var ownedOnLaunch: List<SupportPurchase>? = null
    var displayPrice: String? = "CA$4.99"
    var priceFails = false
    var acknowledgementFails = false
    var launchResult = LaunchResult.STARTED
    var launches = 0
    var closed = false
    val acknowledgements = mutableListOf<String>()

    override suspend fun purchases() = owned
    override suspend fun price(): String? {
      check(!priceFails) { "store unavailable" }
      return displayPrice
    }
    override suspend fun acknowledge(token: String) {
      check(!acknowledgementFails) { "acknowledgement failed" }
      acknowledgements.add(token)
    }
    override fun launch(): LaunchResult {
      launches++
      ownedOnLaunch?.let { owned = it }
      return launchResult
    }
    override fun close() { closed = true }
    fun update() { onUpdate?.invoke(Result.success(owned)) }
  }
}
