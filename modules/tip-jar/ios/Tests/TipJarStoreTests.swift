import StoreKit
import StoreKitTest
import XCTest
@testable import TipJarTestHost

final class TipJarStoreTests: XCTestCase {
  private var session: SKTestSession!

  override func setUpWithError() throws {
    session = try SKTestSession(contentsOf: XCTUnwrap(Bundle(for: Self.self).url(forResource: "Support", withExtension: "storekit")))
    session.resetToDefaultState()
    session.clearTransactions()
    session.disableDialogs = true
  }

  override func tearDownWithError() throws {
    session.clearTransactions()
    session.resetToDefaultState()
    session = nil
  }

  func testPurchaseIsOneTimeAndRestorable() async throws {
    let store = TipJarStore()
    let initial = try await store.status()
    XCTAssertEqual(initial["available"] as? Bool, true)
    XCTAssertEqual(initial["hasSupported"] as? Bool, false)
    XCTAssertNotNil(initial["displayPrice"] as? String)

    let result = try await store.purchase()
    XCTAssertEqual(result, "purchased")
    let restored = try await TipJarStore().restore()
    XCTAssertEqual(restored["hasSupported"] as? Bool, true)
    let repeated = try await store.purchase()
    XCTAssertEqual(repeated, "purchased")
    XCTAssertEqual(session.allTransactions().count, 1)
  }

  func testPendingDonationDoesNotBecomeSupportUntilApproved() async throws {
    session.askToBuyEnabled = true
    let store = TipJarStore()
    let result = try await store.purchase()
    XCTAssertEqual(result, "pending")
    let pending = try await store.status()
    XCTAssertEqual(pending["hasSupported"] as? Bool, false)

    let updated = expectation(description: "approved transaction arrives")
    await store.startObserving { updated.fulfill() }
    let transaction = try XCTUnwrap(session.allTransactions().first)
    try session.approveAskToBuyTransaction(identifier: transaction.identifier)
    await fulfillment(of: [updated], timeout: 10)
    let approved = try await store.status()
    XCTAssertEqual(approved["hasSupported"] as? Bool, true)
    await store.stopObserving()
  }

  func testRefundNotificationRemovesSupportStatus() async throws {
    let store = TipJarStore()
    _ = try await store.purchase()
    let updated = expectation(description: "refund transaction arrives")
    await store.startObserving { updated.fulfill() }
    let transaction = try XCTUnwrap(session.allTransactions().first)
    try session.refundTransaction(identifier: transaction.identifier)
    await fulfillment(of: [updated], timeout: 10)
    let refreshed = try await store.status()
    XCTAssertEqual(refreshed["hasSupported"] as? Bool, false)
    await store.stopObserving()
  }

  func testFailedPurchaseDoesNotCreateEntitlement() async throws {
    let store = TipJarStore()
    let initial = try await store.status()
    XCTAssertEqual(initial["available"] as? Bool, true)
    try await session.setSimulatedError(.generic(.networkError(URLError(.notConnectedToInternet))), forAPI: .purchase)
    do {
      _ = try await store.purchase()
      XCTFail("a failed purchase must not succeed")
    } catch {
      let status = try await store.status()
      XCTAssertEqual(status["hasSupported"] as? Bool, false)
    }
  }
}
