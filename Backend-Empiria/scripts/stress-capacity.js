/*
Stress test de cupos / concurrencia para Empiria

Uso (PowerShell):
$env:EVENT_ID='TU_EVENT_ID'; $env:EMAIL='admin@empiria.com'; $env:PASSWORD='TuPass'; npm run stress:capacity

Variables opcionales:
- BASE_URL (default: http://localhost:3000/api)
- MODE: paid | free (default: paid)
- CONCURRENCY (default: 20)
- QUANTITY (default: 1)
- TOKEN (si ya tienes JWT, evita login)
*/

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000/api';
const MODE = (process.env.MODE || 'paid').toLowerCase();
const CONCURRENCY = Number(process.env.CONCURRENCY || 20);
const QUANTITY = Number(process.env.QUANTITY || 1);

const cliArgs = parseArgs(process.argv.slice(2));
const EMAIL = cliArgs.email || process.env.EMAIL;
const PASSWORD = cliArgs.password || process.env.PASSWORD;
const TOKEN = cliArgs.token || process.env.TOKEN;
let eventId = cliArgs.eventId || process.env.EVENT_ID;

if (!['paid', 'free'].includes(MODE)) {
    console.error('❌ MODE debe ser paid o free');
    process.exit(1);
}

const now = () => new Date().toISOString();

async function requestJson(url, options = {}) {
    const res = await fetch(url, options);
    const text = await res.text();
    let json = null;
    try {
        json = text ? JSON.parse(text) : null;
    } catch {
        json = { raw: text };
    }
    return { ok: res.ok, status: res.status, json };
}

function parseArgs(args) {
    const map = {};
    for (let i = 0; i < args.length; i++) {
        const key = args[i];
        const value = args[i + 1];
        if (!key.startsWith('--') || !value || value.startsWith('--')) continue;
        map[key.slice(2)] = value;
        i++;
    }
    return {
        eventId: map.eventId,
        email: map.email,
        password: map.password,
        token: map.token
    };
}

async function prompt(question) {
    const { createInterface } = require('readline/promises');
    const { stdin, stdout } = require('process');
    const rl = createInterface({ input: stdin, output: stdout });
    const answer = await rl.question(question);
    rl.close();
    return answer.trim();
}

async function resolveEventId() {
    if (eventId) return eventId;

    const listResult = await requestJson(`${BASE_URL}/events`);
    if (listResult.ok && Array.isArray(listResult.json?.events) && listResult.json.events.length > 0) {
        eventId = listResult.json.events[0]._id;
        console.log(`ℹ️ EVENT_ID no enviado, usando primer evento disponible: ${eventId}`);
        return eventId;
    }

    eventId = await prompt('No se encontró evento automático. Ingresa EVENT_ID: ');
    if (!eventId) {
        throw new Error('EVENT_ID es requerido');
    }
    return eventId;
}

async function loginAndGetToken() {
    if (TOKEN) return TOKEN;

    let correo = EMAIL;
    let contraseña = PASSWORD;

    if (!correo) correo = await prompt('Ingresa EMAIL para login: ');
    if (!contraseña) contraseña = await prompt('Ingresa PASSWORD para login: ');

    if (!correo || !contraseña) {
        throw new Error('Debes definir TOKEN o EMAIL + PASSWORD');
    }

    const body = JSON.stringify({ correo, contraseña });
    const result = await requestJson(`${BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body
    });

    if (!result.ok || !result.json?.token) {
        throw new Error(`Login falló: HTTP ${result.status} - ${JSON.stringify(result.json)}`);
    }

    return result.json.token;
}

async function getEvent(eventId) {
    return requestJson(`${BASE_URL}/events/${eventId}`);
}

function buildPaymentBody() {
    if (MODE === 'free') {
        return { eventId, quantity: QUANTITY };
    }
    return { eventId, quantity: QUANTITY, ticketType: 'general' };
}

function endpointPath() {
    return MODE === 'free' ? '/payments/request-free-tickets' : '/payments/create-preference';
}

async function runOne(index, token) {
    const payload = buildPaymentBody();
    const result = await requestJson(`${BASE_URL}${endpointPath()}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'x-token': token
        },
        body: JSON.stringify(payload)
    });

    return {
        index,
        ok: result.ok,
        status: result.status,
        msg: result.json?.msg || result.json?.message || 'Sin mensaje',
        body: result.json
    };
}

function summarize(results) {
    const byStatus = new Map();
    for (const r of results) {
        byStatus.set(r.status, (byStatus.get(r.status) || 0) + 1);
    }

    const success = results.filter(r => r.ok).length;
    const failed = results.length - success;

    console.log('\n=== RESUMEN STRESS TEST ===');
    console.log(`Total requests: ${results.length}`);
    console.log(`✅ Exitosas: ${success}`);
    console.log(`❌ Fallidas: ${failed}`);
    console.log('Por status HTTP:');
    [...byStatus.entries()].sort((a, b) => a[0] - b[0]).forEach(([status, count]) => {
        console.log(`  - ${status}: ${count}`);
    });

    const topMsgs = new Map();
    for (const r of results) {
        const key = r.msg;
        topMsgs.set(key, (topMsgs.get(key) || 0) + 1);
    }

    console.log('\nMensajes más frecuentes:');
    [...topMsgs.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6).forEach(([msg, count]) => {
        console.log(`  - (${count}) ${msg}`);
    });
}

async function main() {
    console.log(`[${now()}] 🚀 Iniciando stress test de cupos`);
    console.log(`Base URL: ${BASE_URL}`);
    console.log(`Modo: ${MODE}`);
    console.log(`Concurrencia: ${CONCURRENCY}`);
    console.log(`Cantidad por request: ${QUANTITY}`);

    await resolveEventId();
    console.log(`Evento: ${eventId}`);

    const token = await loginAndGetToken();

    const before = await getEvent(eventId);
    if (before.ok && before.json?.event) {
        const e = before.json.event;
        console.log('\nEstado ANTES:');
        console.log(`- title: ${e.title}`);
        console.log(`- capacity: ${e.capacity}`);
        console.log(`- ticketsSold: ${e.ticketsSold}`);
        console.log(`- availableTickets: ${e.availableTickets}`);
        if (typeof e.reservedTickets === 'number') {
            console.log(`- reservedTickets: ${e.reservedTickets}`);
        }
    }

    const jobs = [];
    for (let i = 0; i < CONCURRENCY; i++) {
        jobs.push(runOne(i + 1, token));
    }

    const settled = await Promise.allSettled(jobs);
    const results = settled.map((item, idx) => {
        if (item.status === 'fulfilled') return item.value;
        return {
            index: idx + 1,
            ok: false,
            status: 0,
            msg: item.reason?.message || 'Error inesperado',
            body: null
        };
    });

    summarize(results);

    const after = await getEvent(eventId);
    if (after.ok && after.json?.event) {
        const e = after.json.event;
        console.log('\nEstado DESPUÉS:');
        console.log(`- title: ${e.title}`);
        console.log(`- capacity: ${e.capacity}`);
        console.log(`- ticketsSold: ${e.ticketsSold}`);
        console.log(`- availableTickets: ${e.availableTickets}`);
        if (typeof e.reservedTickets === 'number') {
            console.log(`- reservedTickets: ${e.reservedTickets}`);
        }
    }

    console.log('\n✅ Test finalizado. Revisa que availableTickets nunca sea negativo y que no haya overbooking.');
}

main().catch((err) => {
    console.error('❌ Error en stress test:', err.message);
    process.exit(1);
});
