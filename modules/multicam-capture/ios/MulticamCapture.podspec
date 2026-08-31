Pod::Spec.new do |s|
  s.name           = 'MulticamCapture'
  s.version        = '1.0.0'
  s.summary        = 'The native OpenMulticam capture boundary'
  s.description    = 'An iPhone-only Expo module that owns OpenMulticam capture state and surfaces.'
  s.author         = 'OpenMulticam contributors'
  s.homepage       = 'https://github.com/openmulticam/openmulticam'
  s.platforms      = { :ios => '18.6' }
  s.source         = { git: '' }
  s.static_framework = true
  s.swift_version  = '5.9'

  s.dependency 'ExpoModulesCore'

  s.pod_target_xcconfig = {
    'DEFINES_MODULE' => 'YES',
  }

  s.source_files = '*.swift'
end
