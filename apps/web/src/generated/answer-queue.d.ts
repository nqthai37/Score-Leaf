export function createAnswerQueue(options: {
  save: (id: number, choice: number, revision: number) => Promise<number>;
  revision?: number;
  pending?: Record<number, number>;
  onStatus?: (status: string) => void;
  onAck?: (id: number, choice: number, revision: number) => void;
}): {
  readonly revision: number;
  readonly pending: Record<number, number>;
  readonly size: number;
  enqueue: (id: number, choice: number) => void;
  flush: () => Promise<boolean>;
  close: () => void;
};
