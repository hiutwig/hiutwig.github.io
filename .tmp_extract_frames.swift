import AVFoundation
import AppKit

let input = CommandLine.arguments[1]
let output = CommandLine.arguments[2]
let asset = AVURLAsset(url: URL(fileURLWithPath: input))
let duration = try await asset.load(.duration)
let seconds = CMTimeGetSeconds(duration)
let generator = AVAssetImageGenerator(asset: asset)
generator.appliesPreferredTrackTransform = true
generator.maximumSize = CGSize(width: 540, height: 960)

try FileManager.default.createDirectory(atPath: output, withIntermediateDirectories: true)
let count = 16
for i in 0..<count {
    let t = seconds * Double(i) / Double(count - 1)
    let image = try generator.copyCGImage(at: CMTime(seconds: t, preferredTimescale: 600), actualTime: nil)
    let bitmap = NSBitmapImageRep(cgImage: image)
    let data = bitmap.representation(using: .jpeg, properties: [.compressionFactor: 0.8])!
    try data.write(to: URL(fileURLWithPath: output).appendingPathComponent(String(format: "frame_%02d_%05.2f.jpg", i, t)))
}
print("duration=\(seconds) frames=\(count)")
