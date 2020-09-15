const mungeRecipe = ({
  extendedIngredients,
  analyzedInstructions,
  ...rest
}) => ({
  ...rest,
  ingredients: extendedIngredients.map(ingredient => ingredient.originalString),
  instructions: analyzedInstructions[0].steps.map(step => step.step),
});

module.exports = { mungeRecipe };
