export class ModelConfig {
  /**
   * This is where to put the model names.
   * Params:
   * 
   * Value: This is used as a unique id for back-end processing.
   * Label: This is the label that the users can see on the front end (Upload Page)
   */
  static MODELS = [
    { value: "polyegg_heatmap", label: "Points" },
    { value: "free_annotate", label: "Do not annotate (Free Annotate)" },
    { value: "reserved", label: "RESERVED SLOT FOR DEVS" }
  ];


  /**
   * This is a getter function to get the available models.
   * @returns This returns the available models to be loaded.
   */
  static getAll() {
    return this.MODELS;
  }


}