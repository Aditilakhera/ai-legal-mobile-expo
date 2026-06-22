/**
 * AI Legal Mobile - Telemetry & Application Logger
 * Handles logging diagnostics, performance timers, crash reporting hooks, and analytics dispatchers.
 */

import { AppConfig } from '../config';

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

class AppLogger {
  private isDev = AppConfig.isDevelopment;

  /**
   * Diagnostic trace logs (Only printed in local dev).
   */
  public debug(message: string, ...optionalParams: any[]) {
    if (this.isDev) {
      console.log(`[DEBUG] [${new Date().toISOString()}] ${message}`, ...optionalParams);
    }
  }

  /**
   * Standard status updates.
   */
  public info(message: string, ...optionalParams: any[]) {
    if (this.isDev) {
      console.info(`[INFO] [${new Date().toISOString()}] ${message}`, ...optionalParams);
    } else {
      // In production, sync to lightweight diagnostic trail if needed
    }
  }

  /**
   * Warning conditions that aren't critical failures.
   */
  public warn(message: string, ...optionalParams: any[]) {
    console.warn(`[WARN] [${new Date().toISOString()}] ${message}`, ...optionalParams);
    // Future sync to breadcrumbs
  }

  /**
   * Catastrophic exceptions or network breakdowns.
   */
  public error(message: string, error?: any, ...optionalParams: any[]) {
    console.error(`[ERROR] [${new Date().toISOString()}] ${message}`, error, ...optionalParams);
    
    // Step 12: Trigger crash reporting hooks (e.g. Sentry, Crashlytics)
    this.reportCrash(message, error);
  }

  /**
   * Performance measuring timer wrappers.
   */
  public startTimer(label: string): { stop: () => void } {
    const start = Date.now();
    return {
      stop: () => {
        const duration = Date.now() - start;
        if (this.isDev) {
          console.log(`[PERF] ${label} took ${duration}ms`);
        }
        // Future production sync for real-time telemetry metrics
        this.trackMetric(`perf_${label}`, duration);
      },
    };
  }

  /**
   * Analytics event dispatcher placeholder.
   */
  public trackEvent(eventName: string, properties?: Record<string, any>) {
    this.debug(`[ANALYTICS] Event: ${eventName}`, properties);
    // Future production analytics hooks (e.g. Firebase Analytics, Mixpanel)
  }

  private reportCrash(message: string, error?: any) {
    // Pipeline to Sentry or Firebase Crashlytics
    // Sentry.captureException(error || new Error(message));
  }

  private trackMetric(metricName: string, value: number) {
    // Pipeline to Datadog / custom monitoring gateway
  }
}

export const logger = new AppLogger();
