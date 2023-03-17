var cdk_outputs_file = require("./cdk-outputs.json");

export function getEndpointUrl(searchBy) {
  const stackOutput = cdk_outputs_file[Object.keys(cdk_outputs_file)[0]];
  const result = Object.keys(stackOutput)
    .filter(key => key.toLowerCase().includes(searchBy.toLowerCase()));
    
  return (result && Array.isArray(result) && result.length > 0) ?
  	stackOutput[result[0]] : 
    "";
}