import { OnboardingRepository, type OnboardingProgress } from "@/lib/repositories/onboarding-repository";
import { EventTrackingRepository, EVENT_TYPES } from "@/lib/repositories/event-tracking-repository";

export class OnboardingService {
  private repo: OnboardingRepository;
  private eventRepo: EventTrackingRepository;

  constructor(repo?: OnboardingRepository, eventRepo?: EventTrackingRepository) {
    this.repo = repo ?? new OnboardingRepository();
    this.eventRepo = eventRepo ?? new EventTrackingRepository();
  }

  async getProgress(userId: string): Promise<OnboardingProgress | null> {
    return this.repo.getProgress(userId);
  }

  async saveStep(userId: string, step: number, stepData: Record<string, unknown> = {}): Promise<OnboardingProgress | null> {
    return this.repo.saveStep(userId, step, stepData);
  }

  async completeOnboarding(userId: string, onboardingData: Record<string, unknown> = {}): Promise<OnboardingProgress | null> {
    const result = await this.repo.completeOnboarding(userId);

    // Fire-and-forget event tracking — never blocks
    this.eventRepo.track(userId, EVENT_TYPES.ONBOARDING_COMPLETED, onboardingData).catch(() => {});

    return result;
  }
}