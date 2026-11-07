import { getDatabase } from '../config/db.js';
import { DEMO_FEEDBACK_DATA } from '../utils/demoData.js';

export const feedbackDbService = {
  getFeedbackList({ search, topic, sentiment, urgency, source, limit = 50, offset = 0, companyId = 'demo-company' } = {}) {
    const db = getDatabase();
    let query = 'SELECT * FROM feedback WHERE company_id = ?';
    const params = [companyId];

    if (search && search.trim()) {
      query += ' AND (feedback LIKE ? OR customer_problem LIKE ? OR customer_id LIKE ? OR feedback_id LIKE ?)';
      const term = `%${search.trim()}%`;
      params.push(term, term, term, term);
    }
    if (topic && topic !== 'all') {
      query += ' AND topic = ?';
      params.push(topic);
    }
    if (sentiment && sentiment !== 'all') {
      query += ' AND sentiment = ?';
      params.push(sentiment);
    }
    if (urgency && urgency !== 'all') {
      query += ' AND urgency = ?';
      params.push(urgency);
    }
    if (source && source !== 'all') {
      query += ' AND source = ?';
      params.push(source);
    }

    query += ' ORDER BY date DESC, id DESC LIMIT ? OFFSET ?';
    params.push(Number(limit), Number(offset));

    const rows = db.prepare(query).all(...params);

    // Get total count for pagination
    let countQuery = 'SELECT COUNT(*) as total FROM feedback WHERE company_id = ?';
    const countParams = [companyId];
    if (search && search.trim()) {
      countQuery += ' AND (feedback LIKE ? OR customer_problem LIKE ? OR customer_id LIKE ? OR feedback_id LIKE ?)';
      const term = `%${search.trim()}%`;
      countParams.push(term, term, term, term);
    }
    if (topic && topic !== 'all') {
      countQuery += ' AND topic = ?';
      countParams.push(topic);
    }
    if (sentiment && sentiment !== 'all') {
      countQuery += ' AND sentiment = ?';
      countParams.push(sentiment);
    }
    if (urgency && urgency !== 'all') {
      countQuery += ' AND urgency = ?';
      countParams.push(urgency);
    }
    if (source && source !== 'all') {
      countQuery += ' AND source = ?';
      countParams.push(source);
    }

    const totalRow = db.prepare(countQuery).get(...countParams);
    return {
      items: rows,
      total: totalRow ? totalRow.total : 0,
      limit: Number(limit),
      offset: Number(offset)
    };
  },

  getStats({ companyId = 'demo-company' } = {}) {
    const db = getDatabase();
    
    // Total count
    const totalRow = db.prepare('SELECT COUNT(*) as count FROM feedback WHERE company_id = ?').get(companyId);
    const total = totalRow ? totalRow.count : 0;

    if (total === 0) {
      return {
        total: 0,
        sentiment: { positive: 0, negative: 0, neutral: 0, positivePct: 0, negativePct: 0, neutralPct: 0 },
        topics: [],
        monthlyTrends: [],
        topComplaints: [],
        topFeatureRequests: [],
        recentActivity: [],
        isDemoData: false
      };
    }

    // Sentiment counts
    const sentiments = db.prepare(`
      SELECT sentiment, COUNT(*) as count 
      FROM feedback 
      WHERE company_id = ? 
      GROUP BY sentiment
    `).all(companyId);

    const sentimentMap = { positive: 0, negative: 0, neutral: 0 };
    sentiments.forEach(s => {
      if (s.sentiment && sentimentMap.hasOwnProperty(s.sentiment)) {
        sentimentMap[s.sentiment] = s.count;
      }
    });

    const positivePct = Math.round((sentimentMap.positive / total) * 100) || 0;
    const negativePct = Math.round((sentimentMap.negative / total) * 100) || 0;
    const neutralPct = Math.round((sentimentMap.neutral / total) * 100) || 0;

    // Topics breakdown
    const topics = db.prepare(`
      SELECT topic, COUNT(*) as count 
      FROM feedback 
      WHERE company_id = ? AND topic IS NOT NULL
      GROUP BY topic 
      ORDER BY count DESC
    `).all(companyId);

    // Monthly trends (grouped by YYYY-MM)
    const monthlyTrends = db.prepare(`
      SELECT 
        substr(date, 1, 7) as month,
        COUNT(*) as total,
        SUM(CASE WHEN sentiment = 'positive' THEN 1 ELSE 0 END) as positive,
        SUM(CASE WHEN sentiment = 'negative' THEN 1 ELSE 0 END) as negative,
        SUM(CASE WHEN sentiment = 'neutral' THEN 1 ELSE 0 END) as neutral,
        ROUND(AVG(rating), 1) as avgRating
      FROM feedback 
      WHERE company_id = ? AND date IS NOT NULL
      GROUP BY substr(date, 1, 7)
      ORDER BY month ASC
    `).all(companyId);

    // Top complaints
    const topComplaints = db.prepare(`
      SELECT customer_problem as problem, topic, urgency, COUNT(*) as count
      FROM feedback
      WHERE company_id = ? AND customer_problem IS NOT NULL AND customer_problem != ''
      GROUP BY customer_problem
      ORDER BY count DESC, urgency = 'high' DESC
      LIMIT 5
    `).all(companyId);

    // Most requested features
    const topFeatureRequests = db.prepare(`
      SELECT feature_request as feature, topic, COUNT(*) as count
      FROM feedback
      WHERE company_id = ? AND feature_request IS NOT NULL AND feature_request != ''
      GROUP BY feature_request
      ORDER BY count DESC
      LIMIT 5
    `).all(companyId);

    // Recent activity
    const recentActivity = db.prepare(`
      SELECT feedback_id, customer_id, date, source, feedback, rating, sentiment, topic, urgency, summary
      FROM feedback
      WHERE company_id = ?
      ORDER BY date DESC, id DESC
      LIMIT 6
    `).all(companyId);

    return {
      total,
      sentiment: {
        ...sentimentMap,
        positivePct,
        negativePct,
        neutralPct
      },
      topics,
      monthlyTrends,
      topComplaints,
      topFeatureRequests,
      recentActivity,
      isDemoData: true
    };
  },

  seedDemoData(companyId = 'demo-company') {
    const db = getDatabase();
    const insertStmt = db.prepare(`
      INSERT OR REPLACE INTO feedback (
        feedback_id, customer_id, date, source, feedback, rating,
        company_id, analysis_status, sentiment, topic, urgency,
        customer_problem, feature_request, summary, suggested_action, retained_in_hindsight
      ) VALUES (
        ?, ?, ?, ?, ?, ?, ?, 'analyzed', ?, ?, ?, ?, ?, ?, ?, 0
      )
    `);

    let inserted = 0;
    for (const item of DEMO_FEEDBACK_DATA) {
      insertStmt.run(
        item.feedback_id,
        item.customer_id,
        item.date,
        item.source,
        item.feedback,
        item.rating,
        companyId,
        item.sentiment,
        item.topic,
        item.urgency,
        item.customer_problem,
        item.feature_request,
        item.summary,
        item.suggested_action
      );
      inserted++;
    }

    return { success: true, count: inserted };
  },

  clearData(companyId = 'demo-company') {
    const db = getDatabase();
    const res = db.prepare('DELETE FROM feedback WHERE company_id = ?').run(companyId);
    return { success: true, deleted: res.changes };
  }
};

