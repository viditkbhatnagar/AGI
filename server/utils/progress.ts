/**
 * Shared course-progress helpers.
 *
 * These centralise the per-module completion maths so every surface
 * (dashboard, course list, course detail) agrees. Historically each
 * controller inlined its own `(watched + viewed + quiz) / 3` average, which
 * drifted apart and—because it divided by a fixed 3—capped any module that
 * lacked a component (no quiz, no documents, or no videos) below 100% even
 * when the student had finished everything that actually existed.
 */

export interface ModuleProgressInput {
  /**
   * Per-component completion percentages, in any order. Use `null` for a
   * component that does not exist for the module (no videos / no documents /
   * no quiz) so it is excluded from the average instead of counted as 0.
   */
  components: Array<number | null>;
  /** The module is recorded as complete on the enrollment. */
  isCompleted: boolean;
}

/**
 * Per-module completion percentage.
 *
 * A module that is already marked complete always reads 100%. Otherwise the
 * percentage is the average of only the components that EXIST for the module —
 * a missing quiz / document set / video set is excluded from the average
 * instead of being counted as 0. A module with no components at all has nothing
 * for the student to do, so (unless it is explicitly marked complete) it reads
 * 0% rather than fabricating 100% — an empty module is treated as not-yet-built
 * content, not as finished.
 */
export function moduleCompletionPercent(input: ModuleProgressInput): number {
  if (input.isCompleted) return 100;

  const present = input.components.filter((c): c is number => c !== null);
  if (present.length === 0) return 0;
  return Math.round(present.reduce((sum, p) => sum + p, 0) / present.length);
}

/**
 * Whether a module has been genuinely finished from its existing content:
 * every video watched, every document viewed, and the quiz attempted when one
 * exists. Used to auto-complete quiz-less modules, which otherwise have no
 * path into the enrollment's completedModules list. Returns false for an empty
 * module so we never fabricate completion for a module with nothing to do.
 */
export function isModuleContentComplete(input: {
  totalVideos: number;
  watchedVideos: number;
  totalDocs: number;
  viewedDocs: number;
  quizExists: boolean;
  quizAttempted: boolean;
}): boolean {
  const hasAnyContent =
    input.totalVideos > 0 || input.totalDocs > 0 || input.quizExists;
  if (!hasAnyContent) return false;

  const videosDone = input.totalVideos === 0 || input.watchedVideos >= input.totalVideos;
  const docsDone = input.totalDocs === 0 || input.viewedDocs >= input.totalDocs;
  const quizDone = !input.quizExists || input.quizAttempted;
  return videosDone && docsDone && quizDone;
}
