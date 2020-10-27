/*
 See LICENSE folder for this sample’s licensing information.

 Abstract:
 Implements the view controller for the camera interface.
 */

import UIKit
import AVFoundation
import Photos

class ViewController: UIViewController, AVCaptureAudioDataOutputSampleBufferDelegate, AVCaptureVideoDataOutputSampleBufferDelegate {

    // MARK: View Controller Life Cycle

    override func viewDidLoad() {
        super.viewDidLoad()

        backCameraVideoPreviewLayer?.frame = backCameraVideoPreviewView.frame
        frontCameraVideoPreviewLayer?.frame = frontCameraVideoPreviewView.frame

        UIDevice.current.beginGeneratingDeviceOrientationNotifications()

        /*
         Configure the capture session.
         In general it is not safe to mutate an AVCaptureSession or any of its
         inputs, outputs, or connections from multiple threads at the same time.

         Don't do this on the main queue, because AVCaptureMultiCamSession.startRunning()
         is a blocking call, which can take a long time. Dispatch session setup
         to the sessionQueue so as not to block the main queue, which keeps the UI responsive.
         */
        //		sessionQueue.async {
        self.configureSession()
        //		}

        // Keep the screen awake
        UIApplication.shared.isIdleTimerDisabled = true
    }

    override func viewWillAppear(_ animated: Bool) {
        super.viewWillAppear(animated)

        sessionQueue.async {
            switch self.setupResult {
            case .success:
                // Only setup observers and start the session running if setup succeeded.
                self.addObservers()
                self.session.startRunning()
                self.isSessionRunning = self.session.isRunning

            case .notAuthorized:
                DispatchQueue.main.async {
                    let changePrivacySetting = "\(Bundle.main.applicationName) doesn't have permission to use the camera, please change privacy settings"
                    let message = NSLocalizedString(changePrivacySetting, comment: "Alert message when the user has denied access to the camera")
                    let alertController = UIAlertController(title: Bundle.main.applicationName, message: message, preferredStyle: .alert)

                    alertController.addAction(UIAlertAction(title: NSLocalizedString("OK", comment: "Alert OK button"),
                                                            style: .cancel,
                                                            handler: nil))

                    alertController.addAction(UIAlertAction(title: NSLocalizedString("Settings", comment: "Alert button to open Settings"),
                                                            style: .`default`,
                                                            handler: { _ in
                                                                if let settingsURL = URL(string: UIApplication.openSettingsURLString) {
                                                                    UIApplication.shared.open(settingsURL,
                                                                                              options: [:],
                                                                                              completionHandler: nil)
                                                                }
                    }))

                    self.present(alertController, animated: true, completion: nil)
                }

            case .configurationFailed:
                DispatchQueue.main.async {
                    let alertMsg = "Alert message when something goes wrong during capture session configuration"
                    let message = NSLocalizedString("Unable to capture media", comment: alertMsg)
                    let alertController = UIAlertController(title: Bundle.main.applicationName, message: message, preferredStyle: .alert)

                    alertController.addAction(UIAlertAction(title: NSLocalizedString("OK", comment: "Alert OK button"),
                                                            style: .cancel,
                                                            handler: nil))

                    self.present(alertController, animated: true, completion: nil)
                }

            case .multiCamNotSupported:
                DispatchQueue.main.async {
                    let alertMessage = "Alert message when multi cam is not supported"
                    let message = NSLocalizedString("Multi Cam Not Supported", comment: alertMessage)
                    let alertController = UIAlertController(title: Bundle.main.applicationName, message: message, preferredStyle: .alert)

                    self.present(alertController, animated: true, completion: nil)
                }
            }
        }
    }

    override func viewWillDisappear(_ animated: Bool) {
        sessionQueue.async {
            if self.setupResult == .success {
                self.session.stopRunning()
                self.isSessionRunning = self.session.isRunning
                self.removeObservers()
            }
        }

        super.viewWillDisappear(animated)
    }

    @objc // Expose to Objective-C for use with #selector()
    private func didEnterBackground(notification: NSNotification) {
        // Free up resources.
        dataOutputQueue.async {
            self.renderingEnabled = false
            self.cachedOtherSampleBuffer = nil
        }
    }

    @objc // Expose to Objective-C for use with #selector()
    func willEnterForground(notification: NSNotification) {
        dataOutputQueue.async {
            self.renderingEnabled = true
        }
    }

    // MARK: KVO and Notifications

    private var sessionRunningContext = 0

    private var keyValueObservations = [NSKeyValueObservation]()

    private func addObservers() {
        let keyValueObservation = session.observe(\.isRunning, options: .new) { _, change in
            // JDS: Probably not needed?
        }
        keyValueObservations.append(keyValueObservation)

        let systemPressureStateObservation = observe(\.self.backCameraDeviceInput?.device.systemPressureState, options: .new) { _, change in
//            guard let systemPressureState = change.newValue as? AVCaptureDevice.SystemPressureState else { return }
            // JDS: Also not needed, I think?
        }
        keyValueObservations.append(systemPressureStateObservation)

        NotificationCenter.default.addObserver(self, selector: #selector(didEnterBackground), name: UIApplication.didEnterBackgroundNotification, object: nil)

        NotificationCenter.default.addObserver(self, selector: #selector(willEnterForground), name: UIApplication.willEnterForegroundNotification, object: nil)

        NotificationCenter.default.addObserver(self, selector: #selector(sessionRuntimeError), name: .AVCaptureSessionRuntimeError, object: session)

        // A session can run only when the app is full screen. It will be interrupted in a multi-app layout.
        // Add observers to handle these session interruptions and inform the user.
        // See AVCaptureSessionWasInterruptedNotification for other interruption reasons.

        NotificationCenter.default.addObserver(self, selector: #selector(sessionWasInterrupted), name: .AVCaptureSessionWasInterrupted, object: session)

        NotificationCenter.default.addObserver(self, selector: #selector(sessionInterruptionEnded), name: .AVCaptureSessionInterruptionEnded, object: session)
    }

    private func removeObservers() {
        for keyValueObservation in keyValueObservations {
            keyValueObservation.invalidate()
        }
        keyValueObservations.removeAll()
    }

    private enum SessionSetupResult {
        case success
        case notAuthorized
        case configurationFailed
        case multiCamNotSupported
    }

    private let session = AVCaptureMultiCamSession()
    private var isSessionRunning = false
    private let sessionQueue = DispatchQueue(label: "session queue")
    private let dataOutputQueue = DispatchQueue(label: "data output queue")
    private var setupResult: SessionSetupResult = .success
    @objc dynamic private(set) var backCameraDeviceInput: AVCaptureDeviceInput?
    private let backCameraVideoDataOutput = AVCaptureVideoDataOutput()
    @IBOutlet private var backCameraVideoPreviewView: PreviewMetalView!
    private weak var backCameraVideoPreviewLayer: AVCaptureVideoPreviewLayer?
    private var frontCameraDeviceInput: AVCaptureDeviceInput?
    private let frontCameraVideoDataOutput = AVCaptureVideoDataOutput()
    @IBOutlet private var frontCameraVideoPreviewView: PreviewMetalView!
    private weak var frontCameraVideoPreviewLayer: AVCaptureVideoPreviewLayer?
    private var swapRedChannel: SwapChannelRenderer? = SwapChannelRenderer("swapR")
    private var swapBlueChannel: SwapChannelRenderer? = SwapChannelRenderer("swapB")
    private var cachedOtherSampleBuffer: CMSampleBuffer?
    private var renderingEnabled = true
    private var videoTrackSourceFormatDescription: CMFormatDescription?
    private var pipDevicePosition: AVCaptureDevice.Position = .front
    private var normalizedPipFrame = CGRect.zero

    // Must be called on the session queue
    private func configureSession() {
        guard setupResult == .success else { return }

        guard AVCaptureMultiCamSession.isMultiCamSupported else {
            print("MultiCam not supported on this device")
            setupResult = .multiCamNotSupported
            return
        }

        // When using AVCaptureMultiCamSession, it is best to manually add connections from AVCaptureInputs to AVCaptureOutputs
        // JDS: That comment above doesn't seem to be true
        session.beginConfiguration()
        defer {
            session.commitConfiguration()
        }

        guard configureBackCamera() else {
            setupResult = .configurationFailed
            return
        }

        guard configureFrontCamera() else {
            setupResult = .configurationFailed
            return
        }
    }

    private func configureCamera(device: AVCaptureDevice) {
        let whiteBalanceMode: AVCaptureDevice.WhiteBalanceMode = .locked
//        let exposureMode: AVCaptureDevice.ExposureMode = .autoExpose

        if device.isWhiteBalanceModeSupported(whiteBalanceMode) {
            device.whiteBalanceMode = whiteBalanceMode
        } else {
            print("\(device.localizedName) does not support \(whiteBalanceMode.rawValue)")
        }

//        if device.isExposureModeSupported(exposureMode) {
//            device.exposureMode = exposureMode
//        } else {
//            print("\(device.localizedName) does not support \(exposureMode.rawValue)")
//        }
    }

    var whiteBalanceGains: AVCaptureDevice.WhiteBalanceGains = AVCaptureDevice.WhiteBalanceGains()

    private func configureBackCamera() -> Bool {
        session.beginConfiguration()
        defer {
            session.commitConfiguration()
        }

        // Find the back camera
        guard let backCamera = AVCaptureDevice.default(.builtInWideAngleCamera, for: .video, position: .back) else {
            print("Could not find the back camera")
            return false
        }

        // JDS: zoom in 2x so that the cameras have the same zoom level
        do {
            try backCamera.lockForConfiguration()
            let zoomFactor:CGFloat = 2
            backCamera.videoZoomFactor = zoomFactor
            configureCamera(device: backCamera)
            whiteBalanceGains = backCamera.deviceWhiteBalanceGains
            backCamera.unlockForConfiguration()
        } catch {
            //Catch error from lockForConfiguration
        }

        // Add the back camera input to the session
        do {
            backCameraDeviceInput = try AVCaptureDeviceInput(device: backCamera)

            guard let backCameraDeviceInput = backCameraDeviceInput,
                session.canAddInput(backCameraDeviceInput) else {
                    print("Could not add back camera device input")
                    return false
            }
            session.addInputWithNoConnections(backCameraDeviceInput)
        } catch {
            print("Could not create back camera device input: \(error)")
            return false
        }

        // Add the back camera video data output
        guard session.canAddOutput(backCameraVideoDataOutput) else {
            print("Could not add the back camera video data output")
            return false
        }
        session.addOutput(backCameraVideoDataOutput)
        backCameraVideoDataOutput.videoSettings = [kCVPixelBufferPixelFormatTypeKey as String: Int(kCVPixelFormatType_32BGRA)]
        backCameraVideoDataOutput.setSampleBufferDelegate(self, queue: dataOutputQueue)

        backCameraVideoPreviewView.rotation = PreviewMetalView.Rotation.rotate90Degrees

        return true
    }

    private func configureFrontCamera() -> Bool {
        session.beginConfiguration()
        defer {
            session.commitConfiguration()
        }

        // Find the front camera
        guard let frontCamera = AVCaptureDevice.default(.builtInTelephotoCamera, for: .video, position: .back) else {
            print("Could not find the front camera")
            return false
        }

        // JDS: zoom in 2x so that the cameras have the same zoom level
        do {
            try frontCamera.lockForConfiguration()
            configureCamera(device: frontCamera)
            frontCamera.setWhiteBalanceModeLocked(with: whiteBalanceGains, completionHandler: nil)
            frontCamera.unlockForConfiguration()
        } catch {
            //Catch error from lockForConfiguration
        }

        // Add the front camera input to the session
        do {
            frontCameraDeviceInput = try AVCaptureDeviceInput(device: frontCamera)

            guard let frontCameraDeviceInput = frontCameraDeviceInput,
                session.canAddInput(frontCameraDeviceInput) else {
                    print("Could not add front camera device input")
                    return false
            }
            session.addInputWithNoConnections(frontCameraDeviceInput)
        } catch {
            print("Could not create front camera device input: \(error)")
            return false
        }

        // Add the front camera video data output
        guard session.canAddOutput(frontCameraVideoDataOutput) else {
            print("Could not add the front camera video data output")
            return false
        }
        session.addOutput(frontCameraVideoDataOutput)
        frontCameraVideoDataOutput.videoSettings = [kCVPixelBufferPixelFormatTypeKey as String: Int(kCVPixelFormatType_32BGRA)]
        frontCameraVideoDataOutput.setSampleBufferDelegate(self, queue: dataOutputQueue)

        frontCameraVideoPreviewView.rotation = PreviewMetalView.Rotation.rotate90Degrees
        

        return true
    }

    @objc // Expose to Objective-C for use with #selector()
    private func sessionWasInterrupted(notification: NSNotification) {
        // In iOS 9 and later, the userInfo dictionary contains information on why the session was interrupted.
        if let userInfoValue = notification.userInfo?[AVCaptureSessionInterruptionReasonKey] as AnyObject?,
            let reasonIntegerValue = userInfoValue.integerValue,
            let reason = AVCaptureSession.InterruptionReason(rawValue: reasonIntegerValue) {
            print("Capture session was interrupted (\(reason))")
        }
    }

    @objc // Expose to Objective-C for use with #selector()
    private func sessionInterruptionEnded(notification: NSNotification) {

    }

    @objc // Expose to Objective-C for use with #selector()
    private func sessionRuntimeError(notification: NSNotification) {
        guard let errorValue = notification.userInfo?[AVCaptureSessionErrorKey] as? NSError else {
            return
        }

        let error = AVError(_nsError: errorValue)
        print("Capture session runtime error: \(error)")

        /*
         Automatically try to restart the session running if media services were
         reset and the last start running succeeded. Otherwise, enable the user
         to try to resume the session running.
         */
        if error.code == .mediaServicesWereReset {
            sessionQueue.async {
                if self.isSessionRunning {
                    self.session.startRunning()
                    self.isSessionRunning = self.session.isRunning
                } else {
                }
            }
        } else {
        }
    }

    func alert(title: String, message: String, actions: [UIAlertAction]) {
        let alertController = UIAlertController(title: title, message: message, preferredStyle: .alert)

        actions.forEach {
            alertController.addAction($0)
        }

        self.present(alertController, animated: true, completion: nil)
    }

    private func createVideoSettings() -> [String: NSObject]? {
        guard let backCameraVideoSettings = backCameraVideoDataOutput.recommendedVideoSettingsForAssetWriter(writingTo: .mov) as? [String: NSObject] else {
            print("Could not get back camera video settings")
            return nil
        }
        guard let frontCameraVideoSettings = frontCameraVideoDataOutput.recommendedVideoSettingsForAssetWriter(writingTo: .mov) as? [String: NSObject] else {
            print("Could not get front camera video settings")
            return nil
        }

        if backCameraVideoSettings == frontCameraVideoSettings {
            // The front and back camera video settings are equal, so return either one
            return backCameraVideoSettings
        } else {
            print("Front and back camera video settings are not equal. Check your AVCaptureVideoDataOutput configuration.")
            return nil
        }
    }

    func captureOutput(_ output: AVCaptureOutput, didOutput sampleBuffer: CMSampleBuffer, from connection: AVCaptureConnection) {
        if let videoDataOutput = output as? AVCaptureVideoDataOutput {
            if videoTrackSourceFormatDescription == nil {
                videoTrackSourceFormatDescription = CMSampleBufferGetFormatDescription(sampleBuffer)
            }

            if videoDataOutput == backCameraVideoDataOutput {
                cachedOtherSampleBuffer = sampleBuffer
            } else {
                guard let videoPixelBuffer = CMSampleBufferGetImageBuffer(sampleBuffer),
                    let formatDescription = CMSampleBufferGetFormatDescription(sampleBuffer) else {
                        return
                }

                var finalVideoPixelBuffer = videoPixelBuffer
                if cachedOtherSampleBuffer != nil {
                    guard var otherPixelBuffer = CMSampleBufferGetImageBuffer(cachedOtherSampleBuffer!) else {
                        return
                    }

                    if let swapR = swapRedChannel, let swapB = swapBlueChannel {
                        if !swapR.isPrepared {
                            swapR.prepare(with: formatDescription, outputRetainedBufferCountHint: 3)
                        }
                        if !swapB.isPrepared {
                            swapB.prepare(with: formatDescription, outputRetainedBufferCountHint: 3)
                        }
                        guard let filteredBuffer = swapR.swap(source: finalVideoPixelBuffer, dest: otherPixelBuffer) else {
                            print("Unable to swap R channel")
                            return
                        }
                        guard let otherFilteredBuffer = swapB.swap(source: otherPixelBuffer, dest: finalVideoPixelBuffer) else {
                            print("Unable to swap B channel")
                            return
                        }
                        finalVideoPixelBuffer = filteredBuffer
                        otherPixelBuffer = otherFilteredBuffer
                    }

                    backCameraVideoPreviewView.pixelBuffer = finalVideoPixelBuffer
                    frontCameraVideoPreviewView.pixelBuffer = otherPixelBuffer
                }
            }

        }
    }

    private func createVideoSampleBufferWithPixelBuffer(_ pixelBuffer: CVPixelBuffer, presentationTime: CMTime) -> CMSampleBuffer? {
        guard let videoTrackSourceFormatDescription = videoTrackSourceFormatDescription else {
            return nil
        }

        var sampleBuffer: CMSampleBuffer?
        var timingInfo = CMSampleTimingInfo(duration: .invalid, presentationTimeStamp: presentationTime, decodeTimeStamp: .invalid)

        let err = CMSampleBufferCreateForImageBuffer(allocator: kCFAllocatorDefault,
                                                     imageBuffer: pixelBuffer,
                                                     dataReady: true,
                                                     makeDataReadyCallback: nil,
                                                     refcon: nil,
                                                     formatDescription: videoTrackSourceFormatDescription,
                                                     sampleTiming: &timingInfo,
                                                     sampleBufferOut: &sampleBuffer)
        if sampleBuffer == nil {
            print("Error: Sample buffer creation failed (error code: \(err))")
        }

        return sampleBuffer
    }
}
