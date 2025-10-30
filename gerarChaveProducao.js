import axios from "axios";

async function gerarChavePublicaProducao() {
  const token = "2e386ff6-514e-437f-8eaa-1d6b9888ea34a1e8f0c94eb88024e3df17befcf1a2d308b8-809f-4cdb-a84e-783dbb06eb3c"; // 🔐 Substitua pelo seu token real

  try {
    const response = await axios.post(
      "https://api.pagseguro.com/public-keys",
      { type: "card" },
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      }
    );

    console.log("✅ CHAVE PÚBLICA GERADA COM SUCESSO!");
    console.log(response.data);
  } catch (error) {
    console.error("❌ ERRO AO GERAR CHAVE:");
    console.error(error.response?.data || error.message);
  }
}

gerarChavePublicaProducao();
