Pod::Spec.new do |s|
  s.name           = 'TipJar'
  s.version        = '1.0.0'
  s.summary        = 'Optional support for OpenMulticam'
  s.description    = 'A one-time, restorable developer tip using StoreKit 2.'
  s.author         = 'Rami Maalouf'
  s.homepage       = 'https://github.com/rami-maalouf/open-multicam'
  s.platforms      = { :ios => '18.6' }
  s.source         = { git: '' }
  s.static_framework = true

  s.dependency 'ExpoModulesCore'

  s.pod_target_xcconfig = {
    'DEFINES_MODULE' => 'YES',
  }

  s.source_files = '*.swift'
end
