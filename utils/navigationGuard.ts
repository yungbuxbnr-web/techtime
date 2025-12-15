
import { router } from 'expo-router';

class NavigationGuard {
  private isNavigating = false;
  private navigationTimeout: NodeJS.Timeout | null = null;
  private readonly NAVIGATION_DELAY = 1000;

  /**
   * Safely navigate to a route with protection against rapid navigation calls
   */
  safeNavigate(path: string, options?: { replace?: boolean }): boolean {
    if (this.isNavigating) {
      console.log('[NavigationGuard] Navigation already in progress, ignoring:', path);
      return false;
    }

    try {
      this.isNavigating = true;
      console.log('[NavigationGuard] Navigating to:', path);

      if (options?.replace) {
        router.replace(path);
      } else {
        router.push(path);
      }

      // Reset navigation lock after delay
      this.navigationTimeout = setTimeout(() => {
        this.isNavigating = false;
      }, this.NAVIGATION_DELAY);

      return true;
    } catch (error) {
      console.log('[NavigationGuard] Navigation error:', error);
      this.isNavigating = false;
      return false;
    }
  }

  /**
   * Reset the navigation guard state
   */
  reset(): void {
    this.isNavigating = false;
    if (this.navigationTimeout) {
      clearTimeout(this.navigationTimeout);
      this.navigationTimeout = null;
    }
  }

  /**
   * Check if navigation is currently in progress
   */
  isNavigationInProgress(): boolean {
    return this.isNavigating;
  }

  /**
   * Clean up resources
   */
  cleanup(): void {
    this.reset();
  }
}

// Export a singleton instance
export const navigationGuard = new NavigationGuard();

// Export the class for creating new instances if needed
export default NavigationGuard;
