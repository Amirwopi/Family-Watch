/**
 * Video Preloader & Bandwidth Monitor
 * Progressively prefetches media chunks ahead using HTTP Range requests to warm the browser cache,
 * and calculates real-time download speed in Kbps and recent network activity in KB.
 */

export interface NetworkStats {
  speedKbps: number;
  networkActivityKB: number;
  totalDownloadedKB: number;
}

export class VideoPreloader {
  private static activeController: AbortController | null = null;
  private static isPreloading = false;
  private static lastSpeedKbps = 3500;
  private static lastActivityKB = 150;
  private static totalDownloadedKB = 0;
  private static currentUrl = '';
  private static currentOffset = 0;
  private static contentTotalLength = 0;

  public static getStats(): NetworkStats {
    return {
      speedKbps: Math.round(this.lastSpeedKbps),
      networkActivityKB: Math.round(this.lastActivityKB),
      totalDownloadedKB: Math.round(this.totalDownloadedKB),
    };
  }

  public static async pump(
    streamUrl: string,
    bufferAheadSec: number,
    targetBufferSec: number = 300
  ): Promise<void> {
    if (!streamUrl || this.isPreloading) return;

    // If stream URL changed, reset offset
    if (this.currentUrl !== streamUrl) {
      this.currentUrl = streamUrl;
      this.currentOffset = 0;
      this.contentTotalLength = 0;
    }

    // Only preload if bufferAhead is less than target (e.g. 5 minutes)
    if (bufferAheadSec >= targetBufferSec) return;

    this.isPreloading = true;
    this.activeController = new AbortController();

    const chunkSize = 1.5 * 1024 * 1024; // 1.5 MB range chunks
    const startByte = this.currentOffset;
    const endByte = startByte + chunkSize - 1;

    const startTime = performance.now();

    try {
      const response = await fetch(streamUrl, {
        headers: {
          Range: `bytes=${startByte}-${endByte}`,
        },
        signal: this.activeController.signal,
      });

      if (response.status === 206 || response.status === 200) {
        const contentRange = response.headers.get('content-range');
        if (contentRange) {
          const match = contentRange.match(/\/(\d+)$/);
          if (match) {
            this.contentTotalLength = parseInt(match[1], 10);
          }
        }

        const buffer = await response.arrayBuffer();
        const durationSec = Math.max(0.05, (performance.now() - startTime) / 1000);
        const downloadedBytes = buffer.byteLength;

        // Calculate speed in Kbps
        const speed = (downloadedBytes * 8) / durationSec / 1024;
        this.lastSpeedKbps = Math.round(speed);
        this.lastActivityKB = Math.round(downloadedBytes / 1024);
        this.totalDownloadedKB += this.lastActivityKB;

        this.currentOffset = endByte + 1;
        if (this.contentTotalLength > 0 && this.currentOffset >= this.contentTotalLength) {
          // Reached end of stream
          this.currentOffset = 0;
        }
      }
    } catch {
      // Abort or network fluctuation - ignore gracefully
    } finally {
      this.isPreloading = false;
      this.activeController = null;
    }
  }

  public static stop(): void {
    if (this.activeController) {
      this.activeController.abort();
      this.activeController = null;
    }
    this.isPreloading = false;
  }
}

