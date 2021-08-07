const axios = require("axios");

const app = () => {
  dataFromApi();
};

const dataFromApi = async () => {
  try {
    const res = await axios.get("https://catfact.ninja/fact");
    const fact = await res.data.fact;
    console.log(fact);
  } catch (err) {
    console.log(err);
  }
};

app();
