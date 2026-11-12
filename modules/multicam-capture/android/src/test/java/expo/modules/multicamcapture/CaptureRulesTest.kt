package expo.modules.multicamcapture

import org.junit.Assert.assertEquals
import org.junit.Test

class CaptureRulesTest {
  @Test fun doesNotInventFixedRatesFromVariableRanges() {
    assertEquals(listOf(30), CaptureRules.rates(listOf(15 to 30, 30 to 30), 33_333_333))
  }
  @Test fun filtersByFullHdReadoutDuration() {
    assertEquals(listOf(24, 25), CaptureRules.rates(listOf(24 to 24, 25 to 25, 30 to 30), 40_000_000))
  }
  @Test fun acceptsAllExplicitReleaseRates() {
    assertEquals(listOf(24, 25, 30), CaptureRules.rates(listOf(24 to 24, 25 to 25, 30 to 30), 0))
  }
  @Test(expected = IllegalArgumentException::class) fun rejectsStorageTraversal() {
    CaptureRules.identifier("../recording")
  }
}
