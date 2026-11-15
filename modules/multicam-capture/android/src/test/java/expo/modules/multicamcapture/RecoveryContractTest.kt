package expo.modules.multicamcapture

import org.json.JSONObject
import org.junit.Assert.assertEquals
import org.junit.Assert.assertSame
import org.junit.Test
import java.io.File

// tests/library/recovery-contract.test.ts checks the same expected manifests against the js schema
class RecoveryContractTest {
  private val cases = run {
    var directory: File? = File("").absoluteFile
    while (directory != null && !File(directory, "tests/library/fixtures/android-recovery.json").isFile) directory = directory.parentFile
    val file = File(requireNotNull(directory) { "android-recovery.json not found" }, "tests/library/fixtures/android-recovery.json")
    JSONObject(file.readText()).getJSONArray("cases").let { array -> (0 until array.length()).map { array.getJSONObject(it) } }
  }

  @Test fun recoveredManifestsMatchTheSharedFixture() {
    assertEquals(3, cases.size)
    cases.forEach { case ->
      val staging = case.getJSONObject("staging").payload()
      val media = case.getJSONObject("media").payload().mapValues { (_, value) -> @Suppress("UNCHECKED_CAST") (value as Payload?) }
      val recovered = CaptureRules.recovered(staging, media)
      assertEquals(case.getString("name"), normalized(case.getJSONObject("expected").payload()), normalized(recovered))
    }
  }

  @Test fun aWholeFinalizedTakeIsPromotedUnchanged() {
    val case = cases.first { it.getString("health") == "ready" }
    val staging = case.getJSONObject("staging").payload()
    val media = case.getJSONObject("media").payload().mapValues { (_, value) -> @Suppress("UNCHECKED_CAST") (value as Payload?) }
    assertSame(staging, CaptureRules.recovered(staging, media))
  }

  // json integers parse as Int or Long depending on size, so numbers compare by value
  private fun normalized(value: Any?): Any? = when (value) {
    is Map<*, *> -> value.entries.associate { it.key to normalized(it.value) }
    is List<*> -> value.map { normalized(it) }
    is Number -> if (value.toDouble() % 1.0 == 0.0) value.toLong() else value.toDouble()
    else -> value
  }
}
