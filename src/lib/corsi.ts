import type { DistractorDirection } from "@/lib/types";

export interface CorsiBlock {
  blockIndex: number;
  x: number;
  y: number;
}

export interface CorsiTrial {
  trialIndex: number;
  direction: DistractorDirection;
  sequenceLength: number;
  sequence: number[];
  cycleIndex: number;
}

export const corsiBlocks: CorsiBlock[] = [
  { blockIndex: 0, x: 18, y: 16 },
  { blockIndex: 1, x: 43, y: 12 },
  { blockIndex: 2, x: 76, y: 18 },
  { blockIndex: 3, x: 20, y: 43 },
  { blockIndex: 4, x: 56, y: 37 },
  { blockIndex: 5, x: 82, y: 49 },
  { blockIndex: 6, x: 16, y: 74 },
  { blockIndex: 7, x: 46, y: 71 },
  { blockIndex: 8, x: 76, y: 78 }
];

const forwardTrials: number[][] = [
  [0, 4],
  [2, 7],
  [1, 5, 3],
  [6, 2, 8],
  [0, 7, 4, 1],
  [8, 3, 5, 2],
  [1, 6, 4, 7, 0],
  [5, 2, 8, 3, 6],
  [0, 4, 7, 2, 8, 5],
  [6, 1, 3, 8, 4, 0]
];

const backwardTrials: number[][] = [
  [4, 1],
  [7, 3],
  [2, 8, 0],
  [5, 1, 6],
  [3, 7, 4, 0],
  [8, 2, 5, 1],
  [6, 0, 4, 7, 2],
  [3, 8, 1, 5, 6],
  [7, 2, 8, 4, 0, 5],
  [1, 6, 3, 7, 4, 8]
];

export const corsiTrialList: Array<{
  direction: DistractorDirection;
  sequence: number[];
}> = [
  ...forwardTrials.map((sequence) => ({ direction: "forward" as const, sequence })),
  ...backwardTrials.map((sequence) => ({ direction: "backward" as const, sequence }))
];

export function getCorsiTrial(sessionId: string, trialIndex: number): CorsiTrial {
  const cycleIndex = (trialIndex - 1) % corsiTrialList.length;
  const template = corsiTrialList[cycleIndex];
  const sequence = [...template.sequence];

  return {
    trialIndex,
    direction: template.direction,
    sequenceLength: sequence.length,
    sequence,
    cycleIndex
  };
}

export function getExpectedCorsiResponse(direction: DistractorDirection, sequence: number[]) {
  return direction === "forward" ? sequence : [...sequence].reverse();
}
