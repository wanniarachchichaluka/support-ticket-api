const request = require('supertest');
const app = require('./app');

// Reset tickets before each test
beforeEach(async () => {
  await request(app).delete('/tickets/reset');
});

describe('Health Check', () => {
  test('GET /health returns 200 and healthy status', async () => {
    const res = await request(app).get('/health');
    expect(res.statusCode).toBe(200);
    expect(res.body.status).toBe('healthy');
    expect(res.body.service).toBe('support-ticket-api');
  });
});

describe('Tickets API', () => {
  test('GET /tickets returns empty array initially', async () => {
    const res = await request(app).get('/tickets');
    expect(res.statusCode).toBe(200);
    expect(res.body.count).toBe(0);
    expect(res.body.tickets).toEqual([]);
  });

  test('POST /tickets creates a ticket successfully', async () => {
    const res = await request(app)
      .post('/tickets')
      .send({
        title: 'Database connection failing',
        description: 'Production DB is dropping connections every 5 minutes',
        priority: 'critical'
      });

    expect(res.statusCode).toBe(201);
    expect(res.body.id).toBeDefined();
    expect(res.body.title).toBe('Database connection failing');
    expect(res.body.priority).toBe('critical');
    expect(res.body.status).toBe('open');
    expect(res.body.createdAt).toBeDefined();
  });

  test('POST /tickets returns 400 when title is missing', async () => {
    const res = await request(app)
      .post('/tickets')
      .send({
        description: 'Missing title field'
      });

    expect(res.statusCode).toBe(400);
    expect(res.body.error).toBe('title and description are required');
  });

  test('POST /tickets returns 400 for invalid priority', async () => {
    const res = await request(app)
      .post('/tickets')
      .send({
        title: 'Test ticket',
        description: 'Testing invalid priority',
        priority: 'urgent'
      });

    expect(res.statusCode).toBe(400);
    expect(res.body.error).toContain('priority must be one of');
  });

  test('POST /tickets defaults priority to medium', async () => {
    const res = await request(app)
      .post('/tickets')
      .send({
        title: 'Test ticket',
        description: 'No priority specified'
      });

    expect(res.statusCode).toBe(201);
    expect(res.body.priority).toBe('medium');
  });

  test('GET /tickets/:id returns a specific ticket', async () => {
    const created = await request(app)
      .post('/tickets')
      .send({
        title: 'Jenkins pipeline broken',
        description: 'Pipeline fails at Docker build stage'
      });

    const res = await request(app).get(`/tickets/${created.body.id}`);
    expect(res.statusCode).toBe(200);
    expect(res.body.id).toBe(created.body.id);
    expect(res.body.title).toBe('Jenkins pipeline broken');
  });

  test('GET /tickets/:id returns 404 for unknown ID', async () => {
    const res = await request(app).get('/tickets/non-existent-id');
    expect(res.statusCode).toBe(404);
    expect(res.body.error).toBe('ticket not found');
  });

  test('PATCH /tickets/:id updates ticket status', async () => {
    const created = await request(app)
      .post('/tickets')
      .send({
        title: 'CPU spike on prod server',
        description: 'CPU hitting 95% every hour'
      });

    const res = await request(app)
      .patch(`/tickets/${created.body.id}`)
      .send({ status: 'in-progress' });

    expect(res.statusCode).toBe(200);
    expect(res.body.status).toBe('in-progress');
    expect(res.body.updatedAt).toBeDefined();
  });

  test('PATCH /tickets/:id returns 400 for invalid status', async () => {
    const created = await request(app)
      .post('/tickets')
      .send({
        title: 'Memory leak in API',
        description: 'API memory grows unbounded'
      });

    const res = await request(app)
      .patch(`/tickets/${created.body.id}`)
      .send({ status: 'done' });

    expect(res.statusCode).toBe(400);
    expect(res.body.error).toContain('status must be one of');
  });
});
```

---

### What this is

Nine tests covering every endpoint and every edge case. This is what a real test suite looks like — not just happy path, but validation errors, missing fields, invalid values, and 404s.

**`beforeEach`**
Runs before every single test. Calls `/tickets/reset` to wipe all tickets back to empty. This guarantees every test starts from a clean state — tests never affect each other. In testing this is called **test isolation** and it's critical in CI. Without it, test order matters and builds fail randomly.

**`describe` blocks**
Groups related tests together. In Jest output this shows as nested sections:
```
Health Check
  ✓ GET /health returns 200 and healthy status

Tickets API
  ✓ GET /tickets returns empty array initially
  ✓ POST /tickets creates a ticket successfully
  ✓ POST /tickets returns 400 when title is missing
  ...