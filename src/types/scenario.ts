/**
 * An impact on a particular axis (e.g. Precision, Speed, Collaboration)
 * Keys are axis names, values are numeric scores.
 */
/**
 * An object mapping axis names to numeric impact values.
 * Using Partial<> so not every axis must be present in every object.
 */
export type AxisImpact = Partial<Record<string, number>>;

/**
 * A simple { id, label } pair used for drag-drop items.
 */
export interface DragItem {
  id: string;
  label: string;
}

/**
 * A drop zone definition for layout drag-drop scenarios.
 */
export interface LayoutZone {
  id: string;
  label: string;
}

/**
 * Drag & Drop scenario in "layout" mode (assign items to zones).
 */
export interface DragDropLayoutScenario {
  type: 'drag-drop';
  variant: 'layout';
  title: string;
  instruction: string;
  items: DragItem[];
  correctOrder?: string[]; // Optional, for validation
  dropZones: LayoutZone[];
  axisImpact?: AxisImpact;
}

/**
 * Drag & Drop scenario in "order" mode (reorder a list).
 */
export interface DragDropOrderScenario {
  type: 'drag-drop';
  variant: 'order';
  title: string;
  instruction: string;
  items: DragItem[];
  correctOrder?: string[];
  axisImpact?: AxisImpact;
}

/**
 * Numeric input scenario (user enters a number to match expected value).
 */
export interface NumericInputScenario {
  type: 'numeric-input';
  title: string;
  instruction: string;
  chartData: number[];
  expected: number;
  tolerance: number;
  axisImpact?: AxisImpact;
}

/**
 * A choice option for binary-choice scenarios, with its own axisImpact.
 */
export interface BinaryChoiceOption {
  id: string;
  label: string;
  axisImpact?: AxisImpact;
}

/**
 * Binary choice scenario (user picks one of two or more options).
 */
export interface BinaryChoiceScenario {
  type: 'binary-choice';
  title: string;
  instruction: string;
  options: BinaryChoiceOption[];
}

/**
 * Union of all sub-scenario variants, discriminated by `type` and `variant`.
 */
export type SubScenario =
  | DragDropLayoutScenario
  | DragDropOrderScenario
  | NumericInputScenario
  | BinaryChoiceScenario;

/**
 * Top-level Scenario, mapping each role (key) to a SubScenario definition.
 */
export interface Scenario {
  id: string;
  title: string;
  description: string;
  subScenarios: Record<string, SubScenario>;
}
