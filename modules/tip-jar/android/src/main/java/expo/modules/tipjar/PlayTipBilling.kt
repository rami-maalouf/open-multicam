package expo.modules.tipjar

import android.app.Activity
import android.content.Context
import com.android.billingclient.api.AcknowledgePurchaseParams
import com.android.billingclient.api.BillingClient
import com.android.billingclient.api.BillingClientStateListener
import com.android.billingclient.api.BillingFlowParams
import com.android.billingclient.api.BillingResult
import com.android.billingclient.api.PendingPurchasesParams
import com.android.billingclient.api.ProductDetails
import com.android.billingclient.api.Purchase
import com.android.billingclient.api.QueryProductDetailsParams
import com.android.billingclient.api.QueryPurchasesParams
import kotlinx.coroutines.suspendCancellableCoroutine
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock
import kotlinx.coroutines.withTimeout
import kotlin.coroutines.resume
import kotlin.coroutines.resumeWithException

internal class PlayTipBilling(context: Context, private val activity: () -> Activity?) : TipBilling {
  companion object {
    const val PRODUCT_ID = "com.ramimaalouf.openmulticam.tip.developer.support"
    private const val REQUEST_TIMEOUT_MS = 20_000L
  }

  override var onUpdate: ((Result<List<SupportPurchase>>) -> Unit)? = null
  private val connectionLock = Mutex()
  private var product: ProductDetails? = null
  private var offerToken: String? = null
  private var closed = false
  private val client = BillingClient.newBuilder(context.applicationContext)
    .setListener { result, purchases ->
      when (result.responseCode) {
        BillingClient.BillingResponseCode.OK -> {
          val relevant = purchases.orEmpty().filter { PRODUCT_ID in it.products }
          if (relevant.isNotEmpty()) onUpdate?.invoke(Result.success(relevant.mapNotNull(::supportPurchase)))
          else if (purchases.isNullOrEmpty()) onUpdate?.invoke(Result.success(emptyList()))
        }
        BillingClient.BillingResponseCode.USER_CANCELED -> onUpdate?.invoke(Result.failure(PurchaseCancelled()))
        BillingClient.BillingResponseCode.ITEM_ALREADY_OWNED -> onUpdate?.invoke(Result.failure(PurchaseAlreadyOwned()))
        else -> onUpdate?.invoke(Result.failure(failure(result)))
      }
    }
    .enablePendingPurchases(PendingPurchasesParams.newBuilder().enableOneTimeProducts().build())
    .enableAutoServiceReconnection()
    .build()

  override suspend fun purchases(): List<SupportPurchase> = request {
    suspendCancellableCoroutine { continuation ->
      client.queryPurchasesAsync(
        QueryPurchasesParams.newBuilder().setProductType(BillingClient.ProductType.INAPP).build()
      ) { result, purchases ->
        if (continuation.isActive) {
          if (result.responseCode == BillingClient.BillingResponseCode.OK) {
            continuation.resume(purchases.filter { PRODUCT_ID in it.products }.mapNotNull(::supportPurchase))
          } else continuation.resumeWithException(failure(result))
        }
      }
    }
  }

  override suspend fun price(): String? {
    // never launch with cached product details after a failed or unavailable lookup.
    product = null
    offerToken = null
    val details: ProductDetails? = request {
      suspendCancellableCoroutine { continuation ->
        val params = QueryProductDetailsParams.newBuilder().setProductList(
          listOf(QueryProductDetailsParams.Product.newBuilder()
            .setProductId(PRODUCT_ID)
            .setProductType(BillingClient.ProductType.INAPP)
            .build())
        ).build()
        client.queryProductDetailsAsync(params) { result, products ->
          if (continuation.isActive) {
            if (result.responseCode == BillingClient.BillingResponseCode.OK) {
              continuation.resume(products.productDetailsList.firstOrNull { it.productId == PRODUCT_ID })
            } else continuation.resumeWithException(failure(result))
          }
        }
      }
    }
    val offer = details?.oneTimePurchaseOfferDetailsList?.firstOrNull {
      it.rentalDetails == null && it.preorderDetails == null
    } ?: return null
    product = details
    offerToken = offer.offerToken
    return offer.formattedPrice
  }

  override suspend fun acknowledge(token: String) = request<Unit> {
    suspendCancellableCoroutine { continuation ->
      client.acknowledgePurchase(AcknowledgePurchaseParams.newBuilder().setPurchaseToken(token).build()) { result ->
        if (continuation.isActive) {
          if (result.responseCode == BillingClient.BillingResponseCode.OK) continuation.resume(Unit)
          else continuation.resumeWithException(failure(result))
        }
      }
    }
  }

  override fun launch(): LaunchResult {
    check(!closed) { "The Google Play connection is closed." }
    val currentActivity = checkNotNull(activity()) { "Open the app before making a purchase." }
    check(!currentActivity.isFinishing && !currentActivity.isDestroyed) { "Open the app before making a purchase." }
    val details = checkNotNull(product) { "Donations are temporarily unavailable. All camera features are still free." }
    val productParams = BillingFlowParams.ProductDetailsParams.newBuilder().setProductDetails(details)
    offerToken?.let { productParams.setOfferToken(it) }
    val result = client.launchBillingFlow(
      currentActivity,
      BillingFlowParams.newBuilder().setProductDetailsParamsList(listOf(productParams.build())).build()
    )
    return when (result.responseCode) {
      BillingClient.BillingResponseCode.OK -> LaunchResult.STARTED
      BillingClient.BillingResponseCode.USER_CANCELED -> LaunchResult.CANCELLED
      BillingClient.BillingResponseCode.ITEM_ALREADY_OWNED -> LaunchResult.ALREADY_OWNED
      else -> throw failure(result)
    }
  }

  override fun close() {
    closed = true
    onUpdate = null
    client.endConnection()
  }

  private suspend fun <T> request(operation: suspend () -> T): T = withTimeout(REQUEST_TIMEOUT_MS) {
    check(!closed) { "The Google Play connection is closed." }
    connectionLock.withLock {
      if (!client.isReady) {
        suspendCancellableCoroutine<Unit> { continuation ->
          client.startConnection(object : BillingClientStateListener {
            override fun onBillingSetupFinished(result: BillingResult) {
              if (continuation.isActive) {
                if (result.responseCode == BillingClient.BillingResponseCode.OK) continuation.resume(Unit)
                else continuation.resumeWithException(failure(result))
              }
            }

            override fun onBillingServiceDisconnected() {
              if (continuation.isActive) {
                continuation.resumeWithException(IllegalStateException("Google Play disconnected. Please try again."))
              }
            }
          })
        }
      }
    }
    operation()
  }

  private fun supportPurchase(purchase: Purchase): SupportPurchase? = when (purchase.purchaseState) {
    Purchase.PurchaseState.PURCHASED -> SupportPurchase(purchase.purchaseToken, true, purchase.isAcknowledged)
    Purchase.PurchaseState.PENDING -> SupportPurchase(purchase.purchaseToken, false, purchase.isAcknowledged)
    else -> null
  }

  private fun failure(result: BillingResult): Exception = IllegalStateException(
    "Google Play could not complete the request (${result.responseCode}): ${result.debugMessage}"
  )
}
