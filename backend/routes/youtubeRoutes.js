const express = require('express');
const router = express.Router();
const { extractYouTubeId } = require('../utils/youtube');

/**
 * GET /api/youtube/stats/:videoId
 * Fetches real public statistics (likeCount, viewCount, title, channelTitle)
 * using YouTube Data API v3 (or oEmbed fallback).
 */
router.get('/stats/:videoId', async (req, res) => {
  try {
    const rawInput = req.params.videoId;
    const cleanVideoId = extractYouTubeId(rawInput) || rawInput;

    const apiKey = process.env.YOUTUBE_API_KEY;

    if (apiKey) {
      try {
        const apiUrl = `https://www.googleapis.com/youtube/v3/videos?part=snippet,statistics&id=${cleanVideoId}&key=${apiKey}`;
        const response = await fetch(apiUrl);
        if (response.ok) {
          const data = await response.json();
          if (data.items && data.items.length > 0) {
            const item = data.items[0];
            const snippet = item.snippet || {};
            const stats = item.statistics || {};

            return res.json({
              videoId: cleanVideoId,
              title: snippet.title || null,
              channelTitle: snippet.channelTitle || null,
              likeCount: Number(stats.likeCount) || 0,
              viewCount: Number(stats.viewCount) || 0
            });
          }
        }
      } catch (apiErr) {
        console.warn('[YouTube API] Data API v3 fetch failed, trying oEmbed fallback:', apiErr.message);
      }
    }

    // Public oEmbed Fallback (retrieves official video title and channel name without API key)
    try {
      const oembedUrl = `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${cleanVideoId}&format=json`;
      const oembedRes = await fetch(oembedUrl);
      if (oembedRes.ok) {
        const oembedData = await oembedRes.json();
        return res.json({
          videoId: cleanVideoId,
          title: oembedData.title || null,
          channelTitle: oembedData.author_name || null,
          likeCount: 0,
          viewCount: 0
        });
      }
    } catch (oembedErr) {
      // Fallback ignore
    }

    return res.json({
      videoId: cleanVideoId,
      title: null,
      channelTitle: null,
      likeCount: 0,
      viewCount: 0
    });
  } catch (error) {
    console.error('[YouTube Routes] Error fetching video stats:', error.message);
    return res.status(200).json({
      videoId: req.params.videoId,
      title: null,
      channelTitle: null,
      likeCount: 0,
      viewCount: 0,
      error: error.message
    });
  }
});

module.exports = router;
