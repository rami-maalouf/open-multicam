import Foundation
import StoreKit

actor TipJarStore {
  static let productID = "com.ramimaalouf.openmulticam.tip.developer.support"

  private var product: Product?
  private var transactionTask: Task<Void, Never>?
  private var isPurchasing = false

  func startObserving(onChange: @escaping @Sendable () -> Void) {
    guard transactionTask == nil else { return }
    transactionTask = Task {
      for await update in Transaction.updates {
        guard !Task.isCancelled else { return }
        guard case let .verified(transaction) = update,
          transaction.productID == Self.productID
        else { continue }
        await transaction.finish()
        onChange()
      }
    }
  }

  func stopObserving() {
    transactionTask?.cancel()
    transactionTask = nil
  }

  func status() async throws -> [String: Any] {
    let hasSupported = await hasSupportEntitlement()
    do {
      product = try await Product.products(for: [Self.productID]).first {
        $0.type == .nonConsumable
      }
    } catch {
      if !hasSupported { throw error }
    }
    var result: [String: Any] = [
      "available": product != nil,
      "hasSupported": hasSupported,
    ]
    if let product { result["displayPrice"] = product.displayPrice }
    return result
  }

  func purchase() async throws -> String {
    guard !isPurchasing else { throw TipJarError.purchaseInProgress }
    isPurchasing = true
    defer { isPurchasing = false }

    if await hasSupportEntitlement() { return "purchased" }
    if product == nil { _ = try await status() }
    guard let product else { throw TipJarError.unavailable }

    switch try await product.purchase() {
    case let .success(verification):
      guard case let .verified(transaction) = verification,
        transaction.productID == Self.productID,
        transaction.revocationDate == nil
      else { throw TipJarError.unverified }
      await transaction.finish()
      return "purchased"
    case .userCancelled:
      return "cancelled"
    case .pending:
      return "pending"
    @unknown default:
      throw TipJarError.unverified
    }
  }

  func restore() async throws -> [String: Any] {
    try await AppStore.sync()
    return try await status()
  }

  private func hasSupportEntitlement() async -> Bool {
    for await entitlement in Transaction.currentEntitlements {
      if case let .verified(transaction) = entitlement,
        transaction.productID == Self.productID,
        transaction.revocationDate == nil
      {
        return true
      }
    }
    return false
  }
}

private enum TipJarError: LocalizedError {
  case unavailable
  case unverified
  case purchaseInProgress

  var errorDescription: String? {
    switch self {
    case .unavailable:
      return "Donations are temporarily unavailable. All camera features are still free."
    case .unverified:
      return "The App Store could not verify the purchase. Please try Restore Purchase."
    case .purchaseInProgress:
      return "A purchase is already in progress."
    }
  }
}
