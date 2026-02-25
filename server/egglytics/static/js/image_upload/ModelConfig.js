/**
 * @fileoverview Configuration registry for available annotation models.
 * To register a new model, add an entry to {@link ModelConfig.MODELS}.
 *
 * @module ModelConfig
 */

/**
 * Provides static configuration and access to all available annotation models.
 *
 * Each model entry requires:
 * - `value` — a unique identifier used by the back-end for processing.
 * - `label` — a human-readable name displayed in the upload page dropdown.
 *
 * @example <caption>Adding a new model</caption>
 * // In the MODELS array:
 * { value: "my_new_model", label: "My New Model" }
 *
 * @example <caption>Retrieving all models</caption>
 * const models = ModelConfig.getAll();
 * // [{ value: "polyegg_heatmap", label: "Points" }, ...]
 */
export class ModelConfig {

  /**
   * Registry of all available annotation models.
   *
   * @type {Array<{ value: string, label: string }>}
   *
   * @property {string} value - Unique identifier sent to the back-end, usually set as a key (What developers see in the backend)
   * @property {string} label - Display name shown to the user in the dropdown (What users see in the front-end)
   */
  static MODELS = [
    { value: "polyegg_heatmap",  label: "Points" },
    { value: "free_annotate",    label: "Do not annotate (Free Annotate)" },
    { value: "reserved",         label: "RESERVED SLOT FOR DEVS" }
  ];

  /**
   * Returns all registered annotation models.
   *
   * @returns {Array<{ value: string, label: string }>} A reference to the full
   *   models array. Do not mutate the returned array directly — modify
   *   {@link ModelConfig.MODELS} instead.
   */
  static getAll() {
    return this.MODELS;
  }

}