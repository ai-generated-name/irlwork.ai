"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
var express_1 = require("express");
var supabase_js_1 = require("../lib/supabase.js");
var auth_js_1 = require("../middleware/auth.js");
var router = (0, express_1.Router)();
// Get all jobs
router.get('/', auth_js_1.optionalAuth, function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var _a, category, _b, status_1, minBudget, maxBudget, priority, search, _c, page, _d, limit, query, _e, jobs, error, count, error_1;
    return __generator(this, function (_f) {
        switch (_f.label) {
            case 0:
                _f.trys.push([0, 2, , 3]);
                _a = req.query, category = _a.category, _b = _a.status, status_1 = _b === void 0 ? 'open' : _b, minBudget = _a.minBudget, maxBudget = _a.maxBudget, priority = _a.priority, search = _a.search, _c = _a.page, page = _c === void 0 ? 1 : _c, _d = _a.limit, limit = _d === void 0 ? 20 : _d;
                query = supabase_js_1.supabase.from('jobs').select('*', { count: 'exact' });
                if (status_1 !== 'all')
                    query = query.eq('status', status_1);
                if (category)
                    query = query.eq('category', category);
                if (priority)
                    query = query.eq('priority', priority);
                if (minBudget)
                    query = query.gte('budget', parseFloat(minBudget));
                if (maxBudget)
                    query = query.lte('budget', parseFloat(maxBudget));
                // Search functionality - ilike for case-insensitive search on title/description
                if (search)
                    query = query.or(`title.ilike.%${search}%,description.ilike.%${search}%`);
                query = query.range((page - 1) * limit, page * limit - 1);
                query = query.order('created_at', { ascending: false });
                return [4 /*yield*/, query];
            case 1:
                _e = _f.sent(), jobs = _e.data, error = _e.error, count = _e.count;
                if (error)
                    throw error;
                res.json({
                    jobs: jobs || [],
                    pagination: {
                        page: parseInt(page),
                        limit: parseInt(limit),
                        total: count || 0,
                        pages: Math.ceil((count || 0) / parseInt(limit))
                    }
                });
                return [3 /*break*/, 3];
            case 2:
                error_1 = _f.sent();
                console.error('Get jobs error:', error_1);
                res.status(500).json({ error: 'Failed to get jobs' });
                return [3 /*break*/, 3];
            case 3: return [2 /*return*/];
        }
    });
}); });
// Create job (agents only)
router.post('/', auth_js_1.authenticate, function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var _a, title, description, category, budget, _b, priority, deadline, _c, job, error, error_2;
    return __generator(this, function (_d) {
        switch (_d.label) {
            case 0:
                _d.trys.push([0, 2, , 3]);
                if (req.user.role !== 'agent') {
                    return [2 /*return*/, res.status(403).json({ error: 'Agents only' })];
                }
                _a = req.body, title = _a.title, description = _a.description, category = _a.category, budget = _a.budget, _b = _a.priority, priority = _b === void 0 ? 'normal' : _b, deadline = _a.deadline;
                if (!title || !description || !category || !budget) {
                    return [2 /*return*/, res.status(400).json({ error: 'Title, description, category, and budget are required' })];
                }
                return [4 /*yield*/, supabase_js_1.supabase
                        .from('jobs')
                        .insert({
                        title: title,
                        description: description,
                        category: category,
                        budget: parseFloat(budget),
                        priority: priority,
                        creator_id: req.user.id,
                        status: 'open',
                        proof_status: 'pending_submission'
                    })
                        .select('id, title, description, category, status, budget, created_at')
                        .single()];
            case 1:
                _c = _d.sent(), job = _c.data, error = _c.error;
                if (error)
                    throw error;
                res.status(201).json({ message: 'Job created', job: job });
                return [3 /*break*/, 3];
            case 2:
                error_2 = _d.sent();
                console.error('Create job error:', error_2);
                res.status(500).json({ error: 'Failed to create job' });
                return [3 /*break*/, 3];
            case 3: return [2 /*return*/];
        }
    });
}); });
// Get job by ID
router.get('/:id', auth_js_1.optionalAuth, function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var _a, job, error, error_3;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                _b.trys.push([0, 2, , 3]);
                return [4 /*yield*/, supabase_js_1.supabase
                        .from('jobs')
                        .select('*')
                        .eq('id', req.params.id)
                        .single()];
            case 1:
                _a = _b.sent(), job = _a.data, error = _a.error;
                if (error || !job) {
                    return [2 /*return*/, res.status(404).json({ error: 'Job not found' })];
                }
                res.json({ job: job });
                return [3 /*break*/, 3];
            case 2:
                error_3 = _b.sent();
                console.error('Get job error:', error_3);
                res.status(500).json({ error: 'Failed to get job' });
                return [3 /*break*/, 3];
            case 3: return [2 /*return*/];
        }
    });
}); });
// Accept job (humans only)
router.post('/:id/accept', auth_js_1.authenticate, function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var _a, job, jobError, error, error_4;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                _b.trys.push([0, 3, , 4]);
                if (req.user.role !== 'human') {
                    return [2 /*return*/, res.status(403).json({ error: 'Humans only' })];
                }
                return [4 /*yield*/, supabase_js_1.supabase
                        .from('jobs')
                        .select('*')
                        .eq('id', req.params.id)
                        .single()];
            case 1:
                _a = _b.sent(), job = _a.data, jobError = _a.error;
                if (jobError || !job) {
                    return [2 /*return*/, res.status(404).json({ error: 'Job not found' })];
                }
                if (job.status !== 'open') {
                    return [2 /*return*/, res.status(400).json({ error: 'Job is not open' })];
                }
                if (job.creator_id === req.user.id) {
                    return [2 /*return*/, res.status(400).json({ error: 'Cannot accept your own job' })];
                }
                return [4 /*yield*/, supabase_js_1.supabase
                        .from('jobs')
                        .update({
                        status: 'in_progress',
                        worker_id: req.user.id
                    })
                        .eq('id', req.params.id)];
            case 2:
                error = (_b.sent()).error;
                if (error)
                    throw error;
                res.json({ message: 'Job accepted' });
                return [3 /*break*/, 4];
            case 3:
                error_4 = _b.sent();
                console.error('Accept job error:', error_4);
                res.status(500).json({ error: 'Failed to accept job' });
                return [3 /*break*/, 4];
            case 4: return [2 /*return*/];
        }
    });
}); });
// ============ PHASE 1: PROOF SUBMISSION ============
// POST /api/jobs/:id/proof - Worker submits proof
router.post('/:id/proof', auth_js_1.authenticate, function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var _a, photos, checklist, notes, _b, job, jobError, proof, error, error_5;
    return __generator(this, function (_c) {
        switch (_c.label) {
            case 0:
                _c.trys.push([0, 3, , 4]);
                if (req.user.role !== 'human') {
                    return [2 /*return*/, res.status(403).json({ error: 'Humans only' })];
                }
                _a = req.body, photos = _a.photos, checklist = _a.checklist, notes = _a.notes;
                return [4 /*yield*/, supabase_js_1.supabase
                        .from('jobs')
                        .select('*')
                        .eq('id', req.params.id)
                        .single()];
            case 1:
                _b = _c.sent(), job = _b.data, jobError = _b.error;
                if (jobError || !job) {
                    return [2 /*return*/, res.status(404).json({ error: 'Job not found' })];
                }
                if (job.worker_id !== req.user.id) {
                    return [2 /*return*/, res.status(403).json({ error: 'Not assigned to this job' })];
                }
                if (job.status !== 'in_progress') {
                    return [2 /*return*/, res.status(400).json({ error: 'Job is not in progress' })];
                }
                if (job.proof_status && !['pending_submission', 'disputed'].includes(job.proof_status)) {
                    return [2 /*return*/, res.status(400).json({ error: 'Proof already submitted' })];
                }
                proof = {
                    photos: photos || [],
                    checklist: checklist || {},
                    notes: notes || '',
                    submittedAt: new Date().toISOString(),
                    submittedBy: req.user.id
                };
                return [4 /*yield*/, supabase_js_1.supabase
                        .from('jobs')
                        .update({
                        proof: JSON.stringify(proof),
                        proof_submitted_at: new Date().toISOString(),
                        proof_status: 'submitted',
                        status: 'pending_review'
                    })
                        .eq('id', req.params.id)];
            case 2:
                error = (_c.sent()).error;
                if (error)
                    throw error;
                res.json({
                    message: 'Proof submitted successfully',
                    proofStatus: 'submitted'
                });
                return [3 /*break*/, 4];
            case 3:
                error_5 = _c.sent();
                console.error('Submit proof error:', error_5);
                res.status(500).json({ error: 'Failed to submit proof' });
                return [3 /*break*/, 4];
            case 4: return [2 /*return*/];
        }
    });
}); });
// GET /api/jobs/:id/proof - View submitted proof
router.get('/:id/proof', auth_js_1.authenticate, function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var _a, job, error, error_6;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                _b.trys.push([0, 2, , 3]);
                return [4 /*yield*/, supabase_js_1.supabase
                        .from('jobs')
                        .select('proof, proof_submitted_at, proof_status, creator_id, worker_id')
                        .eq('id', req.params.id)
                        .single()];
            case 1:
                _a = _b.sent(), job = _a.data, error = _a.error;
                if (error || !job) {
                    return [2 /*return*/, res.status(404).json({ error: 'Job not found' })];
                }
                res.json({
                    proof: job.proof ? JSON.parse(job.proof) : null,
                    proofSubmittedAt: job.proof_submitted_at,
                    proofStatus: job.proof_status
                });
                return [3 /*break*/, 3];
            case 2:
                error_6 = _b.sent();
                console.error('Get proof error:', error_6);
                res.status(500).json({ error: 'Failed to get proof' });
                return [3 /*break*/, 3];
            case 3: return [2 /*return*/];
        }
    });
}); });
// ============ PHASE 1: AGENT REVIEW ============
// POST /api/jobs/:id/approve - Agent approves task
router.post('/:id/approve', auth_js_1.authenticate, function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var _a, job, jobError, payout, platformFee, error, wallet, error_7;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                _b.trys.push([0, 7, , 8]);
                return [4 /*yield*/, supabase_js_1.supabase
                        .from('jobs')
                        .select('*')
                        .eq('id', req.params.id)
                        .single()];
            case 1:
                _a = _b.sent(), job = _a.data, jobError = _a.error;
                if (jobError || !job) {
                    return [2 /*return*/, res.status(404).json({ error: 'Job not found' })];
                }
                if (job.creator_id !== req.user.id) {
                    return [2 /*return*/, res.status(403).json({ error: 'Not authorized' })];
                }
                if (job.proof_status !== 'submitted') {
                    return [2 /*return*/, res.status(400).json({ error: 'No proof to approve' })];
                }
                payout = job.budget * 0.85;
                platformFee = job.budget * 0.15;
                return [4 /*yield*/, supabase_js_1.supabase
                        .from('jobs')
                        .update({
                        proof_status: 'approved',
                        status: 'completed',
                        updated_at: new Date().toISOString()
                    })
                        .eq('id', req.params.id)];
            case 2:
                error = (_b.sent()).error;
                if (error)
                    throw error;
                if (!job.worker_id) return [3 /*break*/, 6];
                return [4 /*yield*/, supabase_js_1.supabase
                        .from('pending_transactions')
                        .insert({
                        user_id: job.worker_id,
                        job_id: req.params.id,
                        amount: payout,
                        status: 'pending',
                        clears_at: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(),
                        description: "Payout for: ".concat(job.title)
                    })];
            case 3:
                _b.sent();
                return [4 /*yield*/, supabase_js_1.supabase
                        .from('wallets')
                        .select('*')
                        .eq('user_id', job.worker_id)
                        .single()];
            case 4:
                wallet = (_b.sent()).data;
                if (!wallet) return [3 /*break*/, 6];
                return [4 /*yield*/, supabase_js_1.supabase
                        .from('wallets')
                        .update({
                        pending_balance: (wallet.pending_balance || 0) + payout,
                        updated_at: new Date().toISOString()
                    })
                        .eq('id', wallet.id)];
            case 5:
                _b.sent();
                _b.label = 6;
            case 6:
                res.json({
                    message: 'Task approved',
                    payout: payout,
                    platformFee: platformFee,
                    proofStatus: 'approved'
                });
                return [3 /*break*/, 8];
            case 7:
                error_7 = _b.sent();
                console.error('Approve error:', error_7);
                res.status(500).json({ error: 'Failed to approve task' });
                return [3 /*break*/, 8];
            case 8: return [2 /*return*/];
        }
    });
}); });
// POST /api/jobs/:id/dispute - Agent disputes task
router.post('/:id/dispute', auth_js_1.authenticate, function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var reason, _a, job, jobError, error, error_8;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                _b.trys.push([0, 3, , 4]);
                reason = req.body.reason;
                return [4 /*yield*/, supabase_js_1.supabase
                        .from('jobs')
                        .select('*')
                        .eq('id', req.params.id)
                        .single()];
            case 1:
                _a = _b.sent(), job = _a.data, jobError = _a.error;
                if (jobError || !job) {
                    return [2 /*return*/, res.status(404).json({ error: 'Job not found' })];
                }
                if (job.creator_id !== req.user.id) {
                    return [2 /*return*/, res.status(403).json({ error: 'Not authorized' })];
                }
                return [4 /*yield*/, supabase_js_1.supabase
                        .from('jobs')
                        .update({
                        proof_status: 'disputed',
                        updated_at: new Date().toISOString()
                    })
                        .eq('id', req.params.id)];
            case 2:
                error = (_b.sent()).error;
                if (error)
                    throw error;
                res.json({
                    message: 'Task disputed',
                    reason: reason,
                    proofStatus: 'disputed'
                });
                return [3 /*break*/, 4];
            case 3:
                error_8 = _b.sent();
                console.error('Dispute error:', error_8);
                res.status(500).json({ error: 'Failed to dispute task' });
                return [3 /*break*/, 4];
            case 4: return [2 /*return*/];
        }
    });
}); });
// Get my jobs
router.get('/my/jobs', auth_js_1.authenticate, function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var _a, type, query, _b, jobs, error, error_9;
    return __generator(this, function (_c) {
        switch (_c.label) {
            case 0:
                _c.trys.push([0, 2, , 3]);
                _a = req.query.type, type = _a === void 0 ? 'all' : _a;
                query = supabase_js_1.supabase.from('jobs').select('*');
                if (type === 'created') {
                    query = query.eq('creator_id', req.user.id);
                }
                else if (type === 'accepted') {
                    query = query.eq('worker_id', req.user.id);
                }
                else {
                    query = query.or("creator_id.eq.".concat(req.user.id, ",worker_id.eq.").concat(req.user.id));
                }
                query = query.order('created_at', { ascending: false });
                return [4 /*yield*/, query];
            case 1:
                _b = _c.sent(), jobs = _b.data, error = _b.error;
                if (error)
                    throw error;
                res.json({ jobs: jobs || [] });
                return [3 /*break*/, 3];
            case 2:
                error_9 = _c.sent();
                console.error('Get my jobs error:', error_9);
                res.status(500).json({ error: 'Failed to get jobs' });
                return [3 /*break*/, 3];
            case 3: return [2 /*return*/];
        }
    });
}); });
exports.default = router;
