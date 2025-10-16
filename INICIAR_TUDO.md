# 🚀 INSTRUÇÕES PARA INICIAR FRONTEND E BACKEND

## ✅ O QUE JÁ FOI FEITO:

1. ✅ Todos os processos Node foram **ENCERRADOS**
2. ✅ Cache do Vite foi **LIMPO**
3. ✅ Arquivo `.env` está **CONFIGURADO CORRETAMENTE** com:
   ```
   VITE_PAGBANK_WEBHOOK_URL=https://6c4e7d02319f.ngrok-free.app/api/payments/webhook
   ```

---

## 🎯 AGORA SIGA ESTES PASSOS:

### **Terminal 1: Backend**

```bash
cd "backend pagbank"
npm start
```

**Aguarde até ver:** `Server is running on port 3000`

---

### **Terminal 2: ngrok (já deve estar rodando)**

Se o ngrok não estiver rodando, execute:

```powershell
& "C:\Program Files\PostgreSQL\18\bin\lib\ngrok\tools\ngrok.exe" http 3000
```

**URL do ngrok:** `https://6c4e7d02319f.ngrok-free.app`

---

### **Terminal 3: Frontend (NOVO - LIMPO)**

Abra um **NOVO PowerShell** e execute:

```bash
cd "C:\Users\Dell Precision Tower\Documents\gilson pagbank\pulakatraca teste"
npm run dev
```

---

## 🧪 TESTAR:

1. Acesse: http://localhost:5173
2. Abra o **Console do Navegador** (F12)
3. Execute este comando no console:

```javascript
console.log('Webhook URL:', import.meta.env.VITE_PAGBANK_WEBHOOK_URL)
```

**✅ DEVE MOSTRAR:**
```
Webhook URL: https://6c4e7d02319f.ngrok-free.app/api/payments/webhook
```

4. Tente criar um pedido PIX
5. O erro "invalid notification url" **NÃO deve aparecer mais!**

---

## 🔍 VERIFICAR NO PAGBANK:

Vá em **Network (F12)** → Procure a requisição `POST localhost:3000/api/payments` → **Payload**

Deve mostrar:
```json
"notification_urls": ["https://6c4e7d02319f.ngrok-free.app/api/payments/webhook"]
```

**NÃO DEVE SER `localhost` !**

---

## ⚠️ SE AINDA MOSTRAR LOCALHOST:

1. Feche **TODOS os navegadores**
2. Limpe o cache do navegador (Ctrl+Shift+Del)
3. Abra em **modo anônimo**
4. Teste novamente

---

**Siga esses passos EXATAMENTE nessa ordem! 🚀**

