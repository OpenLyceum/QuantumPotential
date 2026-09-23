/** Runs one chart refresh after all synchronous Property notifications in a change have finished. */
export class CoalescedUpdate {
  private pending = false;
  private readonly update: () => void;

  public constructor(update: () => void) {
    this.update = update;
  }

  public schedule(): void {
    if (this.pending) {
      return;
    }
    this.pending = true;
    queueMicrotask(() => {
      this.pending = false;
      this.update();
    });
  }
}
