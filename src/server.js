const app = require('./app');

const PORT = process.env.PORT || 3000;

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Support Ticket API running on port ${PORT}`);
});
```

---

### What this is and why it's separate from app.js

This is the **entry point** — the file that actually starts the server.

Notice the separation:
```
app.js      — defines the application, routes, logic
              exports the app object
              knows nothing about ports or servers

server.js   — imports the app
              binds it to a port
              starts listening for connections