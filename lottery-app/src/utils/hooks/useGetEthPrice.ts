const url = "https://api.coingecko.com/api/v3/simple/price?ids=goerli-eth&vs_currencies=usd";

export async function  getGethUsdPrice() : Promise<Number> {
  try {
    const response = await fetch(url);
    const jsonData = await response.json();
    return jsonData['goerli-eth'].usd;
  } catch(e) {
    return 0.230852;
  }
  };