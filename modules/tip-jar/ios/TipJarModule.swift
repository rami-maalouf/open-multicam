import ExpoModulesCore

public class TipJarModule: Module {
  private let store = TipJarStore()

  public func definition() -> ModuleDefinition {
    Name("TipJar")

    Events("onChange")

    AsyncFunction("getStatus") { () async throws -> [String: Any] in
      try await self.store.status()
    }

    AsyncFunction("purchase") { () async throws -> String in
      try await self.store.purchase()
    }

    AsyncFunction("restore") { () async throws -> [String: Any] in
      try await self.store.restore()
    }

    OnCreate {
      Task {
        await self.store.startObserving { [weak self] in
          self?.sendEvent("onChange", [:])
        }
      }
    }

    OnDestroy {
      Task { await self.store.stopObserving() }
    }
  }
}
