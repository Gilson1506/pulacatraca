import axios from "axios";

async function consultarPublicKey() {
  const token = "7ff1f78b-1206-4a46-a365-58468fa5ea65804b812047cdb7909944283b3fe3086ca9fa-6be1-4be5-8651-00ba31ec135e"; // ⚠️ substitua pelo token certo

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

    console.log("🔑 Public Key de Produção:");
    console.log(response.data.public_key);
  } catch (error) {
    console.error("❌ Erro ao consultar Public Key:");
    console.error(error.response?.data || error.message);
  }
}

consultarPublicKey();
