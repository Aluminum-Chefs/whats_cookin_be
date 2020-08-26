function mungeRecipe(rawData){

  let recipe = {
    id:rawData.id,
    title: rawData.title,
    sourceUrl: rawData.sourceUrl,
    image: rawData.image,
    summary: rawData.summary,
    readyInMinutes: rawData.readyInMinutes,
    servings: rawData.servings,
    ingredients: [],
    instructions: [],
        


  };

  recipe.ingredients = rawData.extendedIngredients.map(ingredient => ingredient.originalString);
  recipe.instructions = rawData.analyzedInstructions[0].steps.map(step => step.step);
  return recipe;
}
module.exports = { mungeRecipe };
