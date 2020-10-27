/*
 See LICENSE folder for this sample’s licensing information.

 Abstract:
 The rosy-colored filter renderer, implemented with Metal.
 */

import CoreMedia
import CoreVideo
import Metal

class SwapChannelRenderer: FilterRenderer {
    var description: String = "Swap Channel (Metal)"
    var isPrepared = false
    private(set) var inputFormatDescription: CMFormatDescription?
    private(set) var outputFormatDescription: CMFormatDescription?
    private var outputPixelBufferPool: CVPixelBufferPool?
    private let metalDevice = MTLCreateSystemDefaultDevice()!
    private var computePipelineState: MTLComputePipelineState?
    private var textureCache: CVMetalTextureCache!

    private lazy var commandQueue: MTLCommandQueue? = {
        return self.metalDevice.makeCommandQueue()
    }()

    required init(_ functionName: String) {
        let defaultLibrary = metalDevice.makeDefaultLibrary()!
        let kernelFunction = defaultLibrary.makeFunction(name: functionName)
        do {
            computePipelineState = try metalDevice.makeComputePipelineState(function: kernelFunction!)
        } catch {
            print("Could not create pipeline state: \(error)")
        }
    }

    func prepare(with formatDescription: CMFormatDescription, outputRetainedBufferCountHint: Int) {
        reset()

        (outputPixelBufferPool, _, outputFormatDescription) = allocateOutputBufferPool(with: formatDescription,
                                                                                       outputRetainedBufferCountHint: outputRetainedBufferCountHint)
        if outputPixelBufferPool == nil {
            return
        }
        inputFormatDescription = formatDescription

        var metalTextureCache: CVMetalTextureCache?
        if CVMetalTextureCacheCreate(kCFAllocatorDefault, nil, metalDevice, nil, &metalTextureCache) != kCVReturnSuccess {
            assertionFailure("Unable to allocate texture cache")
        } else {
            textureCache = metalTextureCache
        }

        isPrepared = true
    }

    func reset() {
        outputPixelBufferPool = nil
        outputFormatDescription = nil
        inputFormatDescription = nil
        textureCache = nil
        isPrepared = false
    }

    /// - Tag: FilterMetalRosy
    func render(pixelBuffer: CVPixelBuffer) -> CVPixelBuffer? {
        return nil
    }

    func makeTextureFromCVPixelBuffer(pixelBuffer: CVPixelBuffer, textureFormat: MTLPixelFormat) -> MTLTexture? {
        let width = CVPixelBufferGetWidth(pixelBuffer)
        let height = CVPixelBufferGetHeight(pixelBuffer)

        // Create a Metal texture from the image buffer.
        var cvTextureOut: CVMetalTexture?
        CVMetalTextureCacheCreateTextureFromImage(kCFAllocatorDefault, textureCache, pixelBuffer, nil, textureFormat, width, height, 0, &cvTextureOut)

        guard let cvTexture = cvTextureOut, let texture = CVMetalTextureGetTexture(cvTexture) else {
            CVMetalTextureCacheFlush(textureCache, 0)

            return nil
        }

        return texture
    }

    func swap(source: CVPixelBuffer, dest: CVPixelBuffer) -> CVPixelBuffer? {
        if !isPrepared {
            assertionFailure("Invalid state: Not prepared.")
            return nil
        }

        var newPixelBuffer: CVPixelBuffer?
        CVPixelBufferPoolCreatePixelBuffer(kCFAllocatorDefault, outputPixelBufferPool!, &newPixelBuffer)
        guard let outputPixelBuffer = newPixelBuffer else {
            print("Allocation failure: Could not get pixel buffer from pool. (\(self.description))")
            return nil
        }
        guard let sourceTexture = makeTextureFromCVPixelBuffer(pixelBuffer: source, textureFormat: .bgra8Unorm),
            let outputTexture = makeTextureFromCVPixelBuffer(pixelBuffer: outputPixelBuffer, textureFormat: .bgra8Unorm),
            let destTexture = makeTextureFromCVPixelBuffer(pixelBuffer: dest, textureFormat: .bgra8Unorm) else {
                return nil
        }

        // Set up command queue, buffer, and encoder.
        guard let commandQueue = commandQueue,
            let commandBuffer = commandQueue.makeCommandBuffer(),
            let commandEncoder = commandBuffer.makeComputeCommandEncoder() else {
                print("Failed to create a Metal command queue.")
                CVMetalTextureCacheFlush(textureCache!, 0)
                return nil
        }

        commandEncoder.label = "Rosy Metal"
        commandEncoder.setComputePipelineState(computePipelineState!)
        commandEncoder.setTexture(sourceTexture, index: 0)
        commandEncoder.setTexture(destTexture, index: 1)
        commandEncoder.setTexture(outputTexture, index: 2)

        // Set up the thread groups.
        let width = computePipelineState!.threadExecutionWidth
        let height = computePipelineState!.maxTotalThreadsPerThreadgroup / width
        let threadsPerThreadgroup = MTLSizeMake(width, height, 1)
        let threadgroupsPerGrid = MTLSize(width: (sourceTexture.width + width - 1) / width,
                                          height: (sourceTexture.height + height - 1) / height,
                                          depth: 1)
        commandEncoder.dispatchThreadgroups(threadgroupsPerGrid, threadsPerThreadgroup: threadsPerThreadgroup)

        commandEncoder.endEncoding()
        commandBuffer.commit()
        return outputPixelBuffer
    }
}
