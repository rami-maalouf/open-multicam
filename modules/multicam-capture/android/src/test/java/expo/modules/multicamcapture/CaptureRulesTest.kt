package expo.modules.multicamcapture

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
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

  @Test fun landscapeFollowsTheDisplayInBothDirections() {
    assertEquals(0, CaptureRules.deviceRotation("portrait", 90))
    assertEquals(90, CaptureRules.deviceRotation("landscape", 90))
    assertEquals(270, CaptureRules.deviceRotation("landscape", 270))
    // a layout that reports landscape while the display has not turned yet keeps the common hold
    assertEquals(90, CaptureRules.deviceRotation("landscape", 0))
  }
  @Test fun oppositeLandscapesRotateTheFeedByHalfATurn() {
    // a back sensor mounted at 90 degrees and a front sensor mounted at 270, as on most phones
    assertEquals(90, CaptureRules.feedRotation(90, 0, front = false))
    assertEquals(0, CaptureRules.feedRotation(90, 90, front = false))
    assertEquals(180, CaptureRules.feedRotation(90, 270, front = false))
    assertEquals(270, CaptureRules.feedRotation(270, 0, front = true))
    assertEquals(0, CaptureRules.feedRotation(270, 90, front = true))
    assertEquals(180, CaptureRules.feedRotation(270, 270, front = true))
  }

  @Test fun twoFileTakesKeepRoomToAttachTheMicrophoneToCameraB() {
    val cameraB = 2_700L * 1024 * 1024
    val reserve = CaptureRules.remuxReserveBytes(cameraB)
    assertTrue(reserve > cameraB)
    // 2.8 gb free is plenty for a single take but not for writing a 2.7 gb camera b again
    val free = 2_800L * 1024 * 1024
    assertFalse(CaptureRules.storageCritical(free, 0))
    assertTrue(CaptureRules.storageCritical(free, reserve))
    assertTrue(CaptureRules.storageCritical(CaptureRules.storageReserveBytes - 1, 0))
  }

  @Test fun copiedAudioKeepsItsOffsetFromTheFirstFrame() {
    // recorder a's microphone started 300 ms before the first frame; b's file starts at its first frame
    val firstVideoA = 300_000L
    val firstVideoB = 0L
    assertEquals(0L, CaptureRules.shiftedAudioTimeUs(300_000, firstVideoA, firstVideoB))
    assertEquals(1_000_000L, CaptureRules.shiftedAudioTimeUs(1_300_000, firstVideoA, firstVideoB))
    // audio from before the first frame lands before b's first frame, and the remux drops it
    assertTrue(CaptureRules.shiftedAudioTimeUs(0, firstVideoA, firstVideoB) < 0)
    // when b's first frame carries an offset of its own, audio follows it
    assertEquals(1_021_300L, CaptureRules.shiftedAudioTimeUs(1_300_000, firstVideoA, 21_300))
  }

  @Test fun aFailureOnlyTearsDownTheGenerationThatRaisedIt() {
    val gate = FailureGate()
    assertTrue(gate.admit(token = 3, current = 3))
    // a second callback from the same broken generation is not queued twice
    assertFalse(gate.admit(token = 3, current = 3))
    // a callback from cameras that were already replaced is stale
    assertFalse(gate.admit(token = 3, current = 4))
    assertTrue(gate.admit(token = 4, current = 4))
  }

  @Test fun camerasGetPlainNamesAndANumberOnlyWhenTwoWouldMatch() {
    assertEquals("Front Camera", CaptureRules.cameraLabel("front", "wide", 0, 1))
    assertEquals("Back Ultra Wide Camera", CaptureRules.cameraLabel("back", "ultra-wide", 0, 1))
    assertEquals("Back Telephoto Camera", CaptureRules.cameraLabel("back", "telephoto", 0, 1))
    assertEquals("External Camera", CaptureRules.cameraLabel("unspecified", "external", 0, 1))
    assertEquals("Back Camera 2", CaptureRules.cameraLabel("back", "wide", 1, 2))
  }
}
