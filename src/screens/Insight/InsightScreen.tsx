import React, { useState, useEffect, useMemo } from 'react';
import {
  View, Text, StyleSheet, ScrollView, SafeAreaView,
  TouchableOpacity, Modal,
} from 'react-native';
import { spacing, fontSize, radius } from '../../theme';
import { useTheme } from '../../theme/ThemeContext'; 
import { store } from '../../data/store';
import { isTrendDeclining, checkPattern } from '../../core/scoringEngine';
import type { PersistedEntry } from '../../data/storageTypes';

// ── Article content system ────────────────────────────────────────────────────
// Articles are stored here as structured data.
// To add real articles: replace the placeholder body text with your compiled
// content. The screen code does not need to change.

interface Article {
  id:         string;
  title:      string;
  subtitle:   string;
  emotion:    string;   // which core emotion triggers this article
  framing:    'coping' | 'growth' | 'both';
  readTime:   number;   // minutes
  body:       string[];  // paragraphs
}

const ARTICLES: Article[] = [
  // ── Joy ──────────────────────────────────────────────────────────────────
  {
    id: 'joy-savoring',
    title: 'Making Joy Last Longer',
    subtitle: 'The science of savoring positive experiences',
    emotion: 'Joy',
    framing: 'growth',
    readTime: 4,
    body: [
      'Research in positive psychology shows that people who actively savor positive experiences report higher overall wellbeing than those who simply experience them passively. Savoring is the practice of deliberately attending to and appreciating positive moments as they happen.',
      'Studies by Fred Bryant at Loyola University found that people who practiced savoring techniques for just a few weeks showed measurable increases in happiness and decreases in depressive symptoms. The key is intentionality — noticing that something good is happening and choosing to stay present with it.',
      'Practical savoring techniques include sharing the experience with someone else, taking a mental photograph of the moment, and expressing gratitude either internally or aloud. Each of these extends the emotional impact of positive experiences beyond the moment itself.',
      'MoodMap tip: When you log Joy or its derivatives, your journal note is a form of savoring. Writing specifically about what caused the feeling — rather than just that it happened — extends its positive effect.',
    ],
  },
  {
    id: 'finding-purpose-and-meaning',
    title: 'Finding Purpose and Meaning',
    subtitle: 'Purpose is rarely discovered all at once—it often grows through curiosity, connection, and the experiences that make life meaningful.',
    emotion: 'Joy',
    framing: 'growth',
    readTime: 6,
    body: [
      'Many people spend part of their lives wondering what their purpose is. While this question is deeply personal, purpose is rarely something that appears all at once. More often, it develops gradually as we learn about ourselves, connect with others, and discover what brings us fulfillment.',
      'Purpose cannot be forced. It is difficult to find meaning while waiting for a single life-changing realization. Instead, purpose often grows from trying new experiences, exploring different interests, and remaining open to opportunities that spark curiosity. Sometimes you discover what matters by first discovering what does not.',
      'Meaning can be found in many places. For some people, it comes through family, friendships, or community. Others find it through creative hobbies, careers, volunteering, learning, faith, or helping others. There is no universal formula because purpose reflects what feels meaningful to you, not what others expect.',
      'As your life changes, your sense of purpose may change as well. The goals that motivated you ten years ago may not be the same ones that inspire you today. Allowing your purpose to evolve is a natural part of personal growth rather than a sign that something has gone wrong.',
      'Instead of asking yourself whether you have found your purpose, try asking what gives you energy, what makes time seem to pass quickly, or what leaves you feeling fulfilled after it is finished. These moments often provide valuable clues about the direction you want your life to take.',
      'Purpose is less about finding one perfect answer and more about creating a life that reflects your values. By staying curious, investing in meaningful relationships, and continuing to explore the world around you, you give purpose the opportunity to grow naturally over time.',
      'MoodMap tip: Pay attention to the entries that leave you feeling energized, grateful, or fulfilled. Looking back over these moments may reveal patterns that point toward the people, activities, and values that bring the greatest meaning to your life.',
    ],
  },
  {
    id: 'practicing-gratitude-every-day',
    title: 'Practicing Gratitude Every Day',
    subtitle: 'Gratitude does not ignore life\'s difficulties—it helps you recognize the good that exists alongside them.',
    emotion: 'Joy',
    framing: 'growth',
    readTime: 6,
    body: [
      'Gratitude is more than simply saying "thank you." It is the practice of noticing and appreciating the people, experiences, and opportunities that add value to your life. Even during difficult seasons, taking time to recognize what is going well can have a meaningful impact on your emotional well-being.',
      'Practicing gratitude does not mean pretending that problems do not exist. Life can be stressful, painful, and uncertain. Gratitude simply reminds us that difficult moments are rarely the entire story. A challenging day can still include supportive friends, a safe place to rest, a favorite meal, or a small moment that made you smile.',
      'One of gratitude\'s greatest strengths is its ability to interrupt catastrophizing. When we become overwhelmed, our minds naturally focus on what is wrong while overlooking what remains steady and supportive. Stepping back to notice the things we still have can create a more balanced perspective without dismissing the challenges we face.',
      'Gratitude can also strengthen relationships. Expressing appreciation to family members, friends, coworkers, or even strangers helps people feel seen and valued. These small expressions of kindness often deepen connections while reminding us that we are surrounded by more support than we sometimes realize.',
      'Like any skill, gratitude becomes stronger through practice. Some people keep a gratitude journal, while others pause each evening to reflect on a few positive moments from their day. The goal is not to find extraordinary experiences every time, but to notice the ordinary moments that often go unnoticed.',
      'Gratitude is not about convincing yourself that life is perfect. It is about recognizing that even imperfect lives contain moments worth appreciating. By regularly noticing what brings you comfort, joy, or hope, you create a habit that can support your mental health through both ordinary days and difficult seasons.',
      'MoodMap tip: At the end of each day, write down three things you appreciated, no matter how small. Looking back on these entries over time can reveal patterns of joy and support that are easy to overlook in the moment.',
    ],
  },

  // ── Trust ─────────────────────────────────────────────────────────────────
  {
    id: 'trust-relationships',
    title: 'How Trust Is Built and Broken',
    subtitle: 'The psychology of interpersonal trust',
    emotion: 'Trust',
    framing: 'growth',
    readTime: 4,
    body: [
      'Trust is one of the foundational elements of human relationships, yet it is surprisingly fragile. Research by John Gottman found that trust is built not in grand gestures but in small, consistent moments — what he calls "sliding door moments" — where one person turns toward another or away.',
      'The neuroscience of trust centers on oxytocin, a neuropeptide released during positive social interactions. Paul Zak\'s research at Claremont Graduate University showed that oxytocin release increases cooperative behavior and that environments which reliably trigger it — through respect, recognition, and consistency — produce higher levels of trust.',
      'Trust is asymmetric: it takes many consistent positive interactions to build and can be destroyed by a single significant violation. This asymmetry explains why trust repair after a betrayal requires disproportionate effort — the violating event carries more weight than the many trust-building events that preceded it.',
      'Research on trust repair shows that acknowledgment of wrongdoing, genuine accountability, and consistent changed behavior over time are the most reliable predictors of whether trust can be rebuilt. Apologies without behavioral change tend to erode trust further.',
      'MoodMap tip: Logging Trust and its derivatives over time can reveal which relationships feel consistently safe and which feel unpredictable. That pattern is worth noticing.',
    ],
  },
  {
    id: 'building-a-sustainable-work-life-balance',
    title: 'Building a Sustainable Work-Life Balance',
    subtitle: 'Discover how purpose, relationships, and healthy boundaries can help you create a life that supports both career success and personal well-being.',
    emotion: 'Trust',
    framing: 'growth',
    readTime: 8,
    body: [
      'Work-life balance is often described as dividing time equally between work and personal life, but balance is rarely that simple. Different seasons of life require different priorities. Some periods demand greater attention to work, while others require more focus on family, health, friendships, or personal growth. Rather than striving for perfect balance every day, many people benefit from thinking about balance as an ongoing process of adjustment and alignment with their values.',
      'One common challenge is that work can easily expand to fill available time. Technology allows many people to remain connected long after the workday ends, making it difficult to fully disengage. Over time, this can create stress, strain relationships, and reduce opportunities for rest and personal fulfillment. Healthy boundaries help create the space needed to maintain energy and engagement in multiple areas of life.',
      'Family and friendships play an important role in overall well-being. Supportive relationships provide emotional connection, perspective, encouragement, and a sense of belonging. When work consistently takes priority over these relationships, people may begin to feel isolated despite professional success. Investing time in the people who matter to you is not a distraction from productivity — it is an important part of maintaining long-term resilience and happiness.',
      'Goals and purpose also influence how people experience balance. Research suggests that individuals often navigate competing demands more effectively when they are guided by a clear sense of purpose. Purpose helps answer an important question: Why am I doing this? Whether your goal is supporting loved ones, building a meaningful career, creating financial stability, helping others, or pursuing personal growth, understanding your deeper motivations can make difficult decisions feel more manageable.',
      'Stress often arises when different areas of life compete for limited time and energy. Instead of trying to maximize every area simultaneously, consider identifying what deserves the most attention in your current season of life. Prioritization is not neglect — it is a realistic response to limited resources.',
      'A fulfilling life is rarely built through career success alone. Work can provide purpose, growth, and financial security, but relationships, health, personal interests, and meaningful experiences contribute to well-being as well. By regularly evaluating your priorities and making adjustments when necessary, you can create a more sustainable and rewarding approach to both work and life.',
      'MoodMap tip: Review your entries each month and identify which areas of life appear most often — work, family, friends, health, hobbies, or personal goals. If one area consistently dominates your mood history, it may be a sign that your current balance deserves a closer look.',
    ],
  },
  {
    id: 'setting-healthy-boundaries',
    title: 'Setting Healthy Boundaries',
    subtitle: 'Boundaries help protect your well-being by clearly communicating what you are comfortable with and what you are not.',
    emotion: 'Trust',
    framing: 'growth',
    readTime: 7,
    body: [
      'Many people think boundaries are about telling others "no." While saying no can be part of boundary setting, healthy boundaries are really about clearly communicating your needs, values, and limits. They help create relationships built on mutual respect rather than resentment or confusion.',
      'Boundaries become especially important when something feels uncomfortable, overwhelming, or unsustainable. Ignoring discomfort for too long often leads to frustration and resentment.',
      'Expressing a boundary is often easier when you focus on your own experience rather than blaming another person. Statements such as "I need some time to think about this" or "I am not comfortable with that" tend to be clearer and less confrontational than accusations or criticism.',
      'Boundaries are not only something we set for other people. They are also commitments we make to ourselves. Holding yourself accountable to your own boundaries can strengthen your ability to communicate them to others.',
      'Not everyone will respond positively to boundaries. Some people may need time to adjust, while others may push back because the previous dynamic benefited them. A boundary is not ineffective simply because someone dislikes it. What matters is whether it supports your well-being and aligns with your values.',
      'Learning to set boundaries is a skill that improves with practice. What matters is developing the confidence to express your needs honestly and respectfully while also honoring the needs of others.',
      'MoodMap tip: Pay attention to entries that mention resentment, exhaustion, frustration, or feeling taken advantage of. These emotions can sometimes signal areas where stronger boundaries may improve your well-being.',
    ],
  },
  {
    id: 'setting-boundaries-with-family',
    title: 'Setting Boundaries With Family',
    subtitle: 'Healthy boundaries allow you to care about your family without sacrificing your own well-being.',
    emotion: 'Trust',
    framing: 'growth',
    readTime: 5,
    body: [
      'Many people find it easier to set boundaries with strangers than with family members. Family relationships often carry expectations, traditions, and a sense of obligation that can make saying "no" feel uncomfortable. However, healthy boundaries are not a sign of disrespect — they are a sign of self-respect.',
      'A common misconception is that family should always come first regardless of the situation. While supporting loved ones can be meaningful, it is important to consider the impact a request may have on your mental, physical, financial, and social well-being.',
      'Before agreeing to something, take time to evaluate whether it aligns with your values, resources, and current responsibilities. A thoughtful no is often healthier than a reluctant yes.',
      'Trust plays an important role in healthy boundaries. Trusting yourself means believing that your needs matter and that you are capable of making decisions that support your well-being.',
      'It is also important to remember that people may not always respond positively when boundaries are introduced. Discomfort does not automatically mean the boundary is wrong.',
      'Healthy family relationships involve mutual respect, not unlimited access to your time, energy, or resources. Setting clear boundaries allows you to show up more authentically and sustainably in the relationships that matter most.',
      'MoodMap tip: If feelings of guilt, exhaustion, or resentment appear frequently in your entries after helping others, consider whether stronger boundaries could help create a healthier balance.',
    ],
  },
  {
    id: 'understanding-and-overcoming-trust-issues',
    title: 'Understanding and Overcoming Trust Issues',
    subtitle: 'Trust grows through consistent actions, honest communication, and a willingness to believe that growth is possible in both yourself and others.',
    emotion: 'Fear',
    framing: 'both',
    readTime: 8,
    body: [
      'Trust can be one of the most rewarding and challenging parts of any relationship. When trust feels uncertain, fear often takes its place. People may become hyperaware of potential threats, question intentions, or worry about being hurt, abandoned, or betrayed.',
      'These reactions are not necessarily signs of weakness. Human beings evolved to notice danger and protect themselves from harm. In relationships, that protective instinct can sometimes appear as jealousy, suspicion, or a constant search for warning signs.',
      'One useful question to ask is whether your fears are based on current evidence or past experiences. Sometimes trust issues are connected to previous betrayals or painful experiences that continue to influence how we view present situations.',
      'Trust is built through actions more than words. Consistency, honesty, accountability, and reliability are often stronger indicators of trustworthiness than promises alone.',
      'If betrayal has occurred, healing may take time. Rebuilding trust is often a gradual process. It is important to remember that forgiveness and trust are related but different — someone may choose to forgive while still needing time before trust is restored.',
      'Part of overcoming trust issues involves developing trust in yourself as well. Confidence in your own judgment and ability to handle challenges can reduce the fear that often drives insecurity.',
      'MoodMap tip: If fear, jealousy, or insecurity appear frequently in your entries, look for situations that trigger those feelings. Understanding the pattern may help you determine whether the emotion is responding to the present moment or to an older experience that still needs healing.',
    ],
  },
  {
    id: 'building-meaningful-connections',
    title: 'Building Meaningful Connections',
    subtitle: 'Strong relationships are built through trust, consistency, and genuine interest — not simply by knowing many people.',
    emotion: 'Trust',
    framing: 'growth',
    readTime: 6,
    body: [
      'Knowing many people can create opportunities, but having a few meaningful relationships often provides the greatest support during life\'s challenges.',
      'Meaningful connections are built over time through shared experiences, honesty, and mutual effort. Trust grows through repeated actions rather than a single conversation.',
      'Listening is one of the most valuable ways to strengthen a relationship. By becoming genuinely curious about another person\'s experiences, you create space for deeper conversations and stronger connections.',
      'Healthy relationships involve balance. Both people should feel valued, respected, and supported.',
      'Strong relationships also influence how we see ourselves. Encouragement from trusted friends can increase confidence and remind us of our strengths during difficult periods.',
      'Building close friendships requires patience and vulnerability. Investing your time in people who consistently invest in you creates relationships that can continue growing through every stage of life.',
      'MoodMap tip: As you reflect on your relationships, pay attention to the people who leave you feeling encouraged, understood, or energized. These patterns can help you identify the connections that contribute most to your well-being.',
    ],
  },
  {
    id: 'building-self-confidence-over-time',
    title: 'Building Self-Confidence Over Time',
    subtitle: 'Confidence grows through experience, practice, and self-acceptance — not by becoming perfect.',
    emotion: 'Trust',
    framing: 'growth',
    readTime: 6,
    body: [
      'Many people think confidence is something you either have or you do not. In reality, confidence is built over time through repeated experiences, learning, and personal growth.',
      'Confidence often develops through mastery. Learning a new skill, improving at a hobby, or overcoming personal challenges reminds you that progress is possible.',
      'Belonging also plays an important role. Feeling accepted by supportive friends, coworkers, or family members can strengthen your belief in yourself.',
      'Building confidence sometimes requires vulnerability. Trying something new or admitting you do not know everything can feel uncomfortable, but these moments often create the experiences that help confidence grow the most.',
      'It is easy to compare your confidence to someone else\'s, but everyone builds it at a different pace. Focus on your own progress rather than someone else\'s timeline.',
      'Confidence is built through hundreds of small moments where you choose to keep learning and showing up. Be patient with yourself.',
      'MoodMap tip: Record moments when you stepped outside your comfort zone, even if they felt small. Looking back on these experiences can remind you how much courage and confidence have already been growing.',
    ],
  },

  // ── Anticipation ──────────────────────────────────────────────────────────
  {
    id: 'anticipation-planning',
    title: 'The Difference Between Anticipation and Anxiety',
    subtitle: 'When looking forward becomes looking out for danger',
    emotion: 'Anticipation',
    framing: 'both',
    readTime: 4,
    body: [
      'Anticipation and anxiety share the same basic cognitive structure — both involve orienting attention toward a future event. What separates them is the valence of the prediction: anticipation involves expecting something positive or at least neutral, while anxiety involves expecting something threatening.',
      'Research in affective forecasting shows that people are surprisingly poor at predicting how intensely they will feel about future events and how long those feelings will last. We tend to overestimate both the intensity and duration of both positive and negative future emotions.',
      'The anxiety associated with an anticipated negative event is often worse than the event itself. Knowing this does not eliminate anxiety, but it can provide a useful cognitive anchor.',
      'Positive anticipation has genuine psychological benefits. Research shows that the pleasure of looking forward to something can rival or even exceed the pleasure of the event itself.',
      'MoodMap tip: Notice whether your entries for Anticipation tend toward excitement or apprehension. The same future-orientation can produce very different emotional colors depending on the underlying prediction.',
    ],
  },
  {
    id: 'becoming-a-parent-and-embracing-change',
    title: 'Becoming a Parent and Embracing Change',
    subtitle: 'Parenthood brings new responsibilities, challenges, and opportunities for growth that can shape both your life and your child\'s future.',
    emotion: 'Anticipation',
    framing: 'growth',
    readTime: 7,
    body: [
      'Becoming a parent is one of life\'s most significant transitions. No matter how much preparation goes into it, the arrival of a child often changes daily routines, priorities, finances, relationships, and future plans. It is normal to feel excited, overwhelmed, uncertain, and hopeful all at the same time.',
      'One of the first adjustments many parents experience is a shift in schedule. Sleep becomes less predictable, personal time may become limited, and everyday tasks often require more planning.',
      'Children learn by observing the adults around them. The way you handle stress, treat other people, and respond to mistakes often teaches more than words alone.',
      'Parenthood can sometimes create pressure to get everything right. In reality, mistakes are a normal part of raising children. What often matters most is the willingness to learn, repair misunderstandings, and continue showing up with care and consistency.',
      'It is equally important to care for yourself. Parents who neglect their own health often find it harder to support others. Taking time to rest and maintain important relationships is not selfish — it helps sustain your ability to care for your family.',
      'There is no single blueprint for becoming a great parent. By focusing on love, communication, growth, and stability, you can create an environment where both you and your child have opportunities to thrive.',
      'MoodMap tip: Track major parenting milestones, challenges, and successes in your entries. Looking back on your progress can provide perspective during difficult moments and highlight growth that is easy to overlook day to day.',
    ],
  },
  {
    id: 'coping-with-major-life-changes',
    title: 'Coping With Major Life Changes',
    subtitle: 'Life transitions take time to adjust to, and giving yourself patience can make change feel more manageable.',
    emotion: 'Anticipation',
    framing: 'both',
    readTime: 6,
    body: [
      'Major life changes often bring a mix of emotions. Whether you are starting a new job, moving, ending a relationship, becoming a parent, or facing an unexpected challenge, it is normal to feel both excitement and uncertainty.',
      'One of the biggest misconceptions about change is that we should adjust quickly. Meaningful transitions often take months or even years before they begin to feel natural.',
      'Creating routines during periods of transition can provide stability when everything else feels uncertain. Small habits such as regular meals, exercise, and sleep schedules remind your mind and body that not everything has changed.',
      'Change also creates opportunities for growth. New experiences often reveal strengths, interests, and perspectives that would have remained hidden otherwise.',
      'Every major life transition asks something different of us, but they all require patience. With time, flexibility, and self-compassion, today\'s uncertainty can gradually become tomorrow\'s normal.',
      'MoodMap tip: When journaling during periods of change, notice not only the challenges but also the small moments that begin to feel familiar. These entries can remind you that adjustment often happens gradually, even when it is difficult to see day by day.',
    ],
  },
  {
    id: 'starting-fresh-after-moving-to-a-new-city',
    title: 'Starting Fresh After Moving to a New City',
    subtitle: 'A new city brings exciting opportunities, unexpected challenges, and the chance to build a life that feels like home.',
    emotion: 'Anticipation',
    framing: 'both',
    readTime: 6,
    body: [
      'Moving to a new city is often filled with mixed emotions. Excitement about new opportunities may exist alongside uncertainty, loneliness, or nervousness about starting over.',
      'One of the biggest challenges after a move is the loss of familiarity. Rather than trying to recreate your old life immediately, focus on gradually building new routines that fit your new environment.',
      'One helpful strategy is to become a regular somewhere. Visiting the same coffee shop, gym, or walking trail each week creates familiarity over time while creating natural opportunities for connection.',
      'Maintaining relationships with people from home is equally important. Regular phone calls or messages can provide encouragement while you adjust.',
      'Building a social network takes time. Small conversations, community events, volunteer opportunities, or shared hobbies can all become stepping stones toward deeper connections.',
      'With patience, consistency, and curiosity, a place that once felt unfamiliar can gradually become home.',
      'MoodMap tip: Record one new experience each week, whether it is visiting a new location, meeting someone, or trying a new activity. Looking back on these moments can help you see how much your new city has become part of your life.',
    ],
  },

  // ── Surprise ──────────────────────────────────────────────────────────────
  {
    id: 'surprise-openness',
    title: 'Staying Open to the Unexpected',
    subtitle: 'What surprise reveals about your expectations',
    emotion: 'Surprise',
    framing: 'growth',
    readTime: 3,
    body: [
      'Surprise is unique among the primary emotions because it has no inherent valence — it is neither positive nor negative until context gives it meaning. What surprise does reveal is the gap between what we expected and what actually happened.',
      'Research on expectation and prediction suggests that the brain is fundamentally a prediction machine. Surprise is the signal that an update is needed.',
      'People with rigid expectations tend to experience more intense negative reactions to surprise. People with more flexible, open expectations tend to experience surprise more neutrally or positively.',
      'Cultivating what Zen philosophy calls "beginner\'s mind" — approaching situations with openness rather than certainty — is associated in psychological research with greater resilience, creativity, and positive affect.',
      'MoodMap tip: When you log Surprise, the journal note is particularly revealing. What were you expecting? What happened instead? Over time, patterns in what surprises you reveal your underlying assumptions about the world.',
    ],
  },
  {
    id: 'recovering-from-a-major-mistake',
    title: 'Recovering From a Major Mistake',
    subtitle: 'Mistakes can change your path, but they do not have to define who you are or who you become.',
    emotion: 'Surprise',
    framing: 'growth',
    readTime: 6,
    body: [
      'Everyone makes mistakes. Some are small inconveniences, while others can have lasting consequences. Mistakes often bring feelings of surprise, guilt, embarrassment, or regret. While these emotions can be uncomfortable, they also create opportunities to learn and grow.',
      'One of the first steps in recovery is separating your actions from your identity. Making a mistake does not mean you are a failure.',
      'After acknowledging a mistake, consider what can realistically be repaired. Sometimes this means apologizing or correcting an error. Other times, the lesson is accepting that some outcomes cannot be changed and choosing how to move forward.',
      'Self-forgiveness is an important part of this process. Compassion creates space for change where harsh self-judgment often creates fear.',
      'Every mistake contains information. Asking yourself what you learned transforms regret into experience.',
      'Your worst moment does not have to become your permanent identity. By accepting responsibility and offering yourself the same forgiveness you would offer someone you care about, you allow mistakes to become part of your growth.',
      'MoodMap tip: When writing about a mistake, include one lesson you learned alongside what happened. Over time, your journal can become a record of growth instead of a collection of regrets.',
    ],
  },
  {
    id: 'processing-unexpected-news',
    title: 'Processing Unexpected News',
    subtitle: 'Whether the news is exciting, difficult, or somewhere in between, giving yourself time to process it can help you respond thoughtfully instead of reacting impulsively.',
    emotion: 'Surprise',
    framing: 'both',
    readTime: 6,
    body: [
      'Life has a way of surprising us. A new job offer, an unexpected diagnosis, a sudden move, or difficult conversations can all arrive without warning. Even when the news is positive, it can interrupt your expectations and leave you unsure of how to feel.',
      'Your first reaction does not have to become your final opinion. Giving yourself permission to pause before making important decisions can help you think more clearly once the initial emotions begin to settle.',
      'It is also important to remember that one event does not define your entire future. Focus on the information you have today instead of every possibility that might never happen.',
      'Talking with someone you trust can also make unexpected news easier to process. Saying your thoughts out loud often helps organize emotions that feel confusing when they remain only in your head.',
      'Allow yourself to return to normal routines when possible. Taking breaks to eat, exercise, or enjoy time with others is not avoiding the situation — it is giving your mind opportunities to process naturally.',
      'Surprises are part of being human. Whatever the situation, remember that you do not have to understand everything immediately.',
      'MoodMap tip: After receiving unexpected news, try recording your first thoughts and then revisit the entry a few days later. Comparing your initial reaction with your later perspective can remind you how naturally our understanding evolves over time.',
    ],
  },

  // ── Fear ──────────────────────────────────────────────────────────────────
  {
    id: 'fear-exposure',
    title: 'Understanding the Fear Response',
    subtitle: 'How anxiety works and what helps',
    emotion: 'Fear',
    framing: 'coping',
    readTime: 5,
    body: [
      'Fear and anxiety are among the most studied emotions in psychology, largely because they are among the most disruptive to daily functioning. At their core, both involve the brain\'s threat detection system — the amygdala — flagging something as potentially dangerous and preparing the body to respond.',
      'The physiological response to fear — increased heart rate, muscle tension, heightened alertness — is the same whether the threat is physical or psychological.',
      'Research on cognitive behavioral approaches to fear consistently shows that avoidance, while providing short-term relief, tends to maintain and strengthen fear over time.',
      'Gradual exposure — approaching feared situations in a controlled, incremental way — is one of the most well-evidenced approaches for reducing fear\'s grip.',
      'MoodMap tip: Tracking when and where you feel Fear or Apprehension over time can reveal patterns that are not obvious in the moment. That pattern is the starting point for understanding it.',
    ],
  },
  {
    id: 'work-stress-recognizing-and-managing-pressure',
    title: 'Recognizing and Managing Work Stress',
    subtitle: 'Learn how to identify work-related stress, understand its effects, and build habits that support your mental and physical well-being.',
    emotion: 'Fear',
    framing: 'coping',
    readTime: 7,
    body: [
      'Stress is a normal part of life, and most people experience some level of pressure at work. In small amounts, stress can motivate us to act. However, when stress becomes constant or overwhelming, it can begin to affect our health, relationships, and quality of life.',
      'Work stress often appears in both the mind and body. Mentally, you may find yourself worrying constantly, struggling to focus, becoming irritable, or feeling emotionally drained. Physically, stress can lead to headaches, fatigue, or sleep difficulties.',
      'One helpful question to ask yourself is whether work stress stays at work. If your job regularly follows you home through worry or exhaustion, it may be time to take a closer look at your stress levels.',
      'Managing stress begins with caring for your body and mind consistently rather than waiting until you are overwhelmed. Getting enough sleep, eating consistently, staying active, and maintaining relationships all help build resilience against stress.',
      'Mindfulness can also be valuable. Even short mindfulness exercises can help reduce feelings of overwhelm and create enough space to regain perspective.',
      'Healthy boundaries play an important role in stress management. Creating separation between work and personal time — such as avoiding work emails after hours — helps protect the energy needed to perform well over the long term.',
      'MoodMap tip: If you frequently tag entries with fear, overwhelm, or exhaustion after work, review your mood history for patterns. Identifying specific triggers can help you create targeted coping strategies.',
    ],
  },
  {
    id: 'managing-social-anxiety-with-confidence',
    title: 'Managing Social Anxiety With Confidence',
    subtitle: 'Feeling nervous around other people is common, and confidence grows through practice, self-compassion, and experience.',
    emotion: 'Fear',
    framing: 'coping',
    readTime: 6,
    body: [
      'Many people feel anxious in social situations. Feeling nervous does not mean something is wrong with you — it is a normal human response to uncertainty and the desire to belong.',
      'One challenge with social anxiety is that fear often changes how we interpret situations. In reality, most people are focused on their own thoughts rather than closely evaluating everything you do.',
      'A helpful way to challenge these fears is to think about how you respond when someone else makes a small social mistake. We naturally forgive these moments in others, yet often struggle to offer ourselves that same kindness.',
      'Building confidence in social situations takes practice, not perfection. Each positive experience teaches your brain that social situations are not as threatening as they first appear.',
      'It can also help to shift your attention outward. Conversations often become easier when your goal changes from "performing well" to "making a genuine connection."',
      'Remember that courage is not the absence of fear — it is choosing to act even when fear is present.',
      'MoodMap tip: After social events, record both what happened and what you feared would happen. Comparing the two over time can help you recognize when anxiety is predicting outcomes that rarely become reality.',
    ],
  },
  {
    id: 'breaking-the-cycle-of-overthinking',
    title: 'Breaking the Cycle of Overthinking',
    subtitle: 'Thinking things through can be helpful, but overthinking often keeps you stuck instead of moving you forward.',
    emotion: 'Fear',
    framing: 'coping',
    readTime: 6,
    body: [
      'Overthinking traps you in an endless loop of "what if" questions that rarely lead anywhere useful. The mind mistakes this constant analysis for preparation, but it usually creates more stress than clarity.',
      'One common form of overthinking is catastrophizing — the habit of imagining the worst possible outcome and treating it as the most likely one.',
      'A helpful question to ask yourself is, "Am I solving a problem, or am I repeating the same thoughts?" If your thinking no longer produces new ideas, it may be time to pause rather than continue searching for certainty.',
      'When overthinking becomes overwhelming, gently redirect your attention to the present. Mindfulness, journaling, or physical activity can interrupt the cycle.',
      'Your thoughts are not always predictions, and they are not always facts. Sometimes the healthiest choice is allowing yourself to move forward despite uncertainty.',
      'MoodMap tip: If you notice the same worries appearing repeatedly in your journal without new information or solutions, ask yourself what small action you could take today. Even one step forward can help break the cycle.',
    ],
  },
  {
    id: 'understanding-and-managing-panic-attacks',
    title: 'Understanding and Managing Panic Attacks',
    subtitle: 'Panic attacks can feel overwhelming, but understanding what is happening in your body can make them less frightening over time.',
    emotion: 'Fear',
    framing: 'coping',
    readTime: 7,
    body: [
      'A panic attack can feel sudden, intense, and frightening. Many people describe symptoms such as a racing heart, chest pain, dizziness, or shortness of breath.',
      'Although panic attacks feel dangerous, they are the result of the body\'s fight-or-flight response becoming activated when there is no immediate physical threat.',
      'Understanding that these sensations are temporary — and that they often peak before gradually fading — can help reduce some of the fear surrounding them.',
      'Slow, controlled breathing and mindfulness can help calm the nervous system during or after a panic attack. These techniques may not stop an attack immediately, but they can help reduce its intensity over time.',
      'If panic attacks happen repeatedly or begin interfering with your daily life, reaching out for professional support is an important next step.',
      'Experiencing a panic attack does not mean you are weak or permanently broken. It means your nervous system has become overwhelmed. With the right tools, many people learn to reduce both the frequency and fear surrounding them.',
      'MoodMap tip: After a panic attack, record what you experienced before, during, and afterward. Over time, your entries may reveal patterns or triggers that help you better understand what contributes to these episodes.',
    ],
  },
  {
    id: 'overcoming-the-fear-of-failure',
    title: 'Overcoming the Fear of Failure',
    subtitle: 'Fear of failure can hold you back from opportunities, but small steps and self-compassion can help build lasting confidence.',
    emotion: 'Fear',
    framing: 'both',
    readTime: 6,
    body: [
      'Fear of failure is one of the most common fears people experience. Sometimes the fear becomes so strong that avoiding the challenge seems safer than trying at all.',
      'Often, the fear is not failure itself but what we believe failure means — that we will disappoint others or prove we are not capable.',
      'One way to reduce this fear is to shift your focus from outcomes to progress. Every attempt provides information that can help you improve the next time.',
      'Large goals can feel intimidating simply because they are difficult to picture. Breaking them into smaller steps makes them easier to begin.',
      'Confidence often develops after action, not before it. Rather than waiting for complete certainty, ask yourself whether you are willing to take the next reasonable step.',
      'Failure is not evidence that you should stop trying. Many meaningful accomplishments are built on setbacks that became valuable lessons.',
      'MoodMap tip: When you avoid a task because it feels overwhelming, write down the smallest possible first step. Progress almost always begins with something much smaller than you first imagined.',
    ],
  },
  {
    id: 'navigating-difficult-coworkers-with-confidence',
    title: 'Navigating Difficult Coworkers Without Losing Yourself',
    subtitle: 'Learn how to handle workplace conflict and respond to difficult coworkers in ways that protect your well-being and professionalism.',
    emotion: 'Fear',
    framing: 'coping',
    readTime: 6,
    body: [
      'Few workplace challenges are as frustrating as dealing with difficult coworkers. While you cannot control how others behave, you can control how you respond.',
      'Not every comment, disagreement, or personality clash requires a response. Choosing not to engage in gossip or unnecessary conflict can protect your energy and reduce stress.',
      'Taking the high road does not mean allowing others to mistreat you. Maintaining professionalism and communicating calmly can help you address issues while protecting your reputation.',
      'Empathy can be useful, though it should not be confused with excusing harmful behavior. Viewing difficult behavior through curiosity rather than judgment can reduce emotional intensity.',
      'If a coworker engages in harassment, discrimination, or behavior that violates workplace policies, document incidents carefully and report through appropriate channels.',
      'Your career is larger than any single coworker. Protecting your focus and continuing to develop your skills can prevent one person\'s behavior from defining your work experience.',
      'MoodMap tip: When documenting difficult interactions, focus on facts, emotions, and outcomes. Over time, your entries may reveal patterns that help you determine whether a situation is an occasional conflict or part of a larger workplace problem.',
    ],
  },

  // ── Sadness ───────────────────────────────────────────────────────────────
  {
    id: 'sadness-processing',
    title: 'Why Sadness Deserves Your Attention',
    subtitle: 'The purpose of difficult emotions',
    emotion: 'Sadness',
    framing: 'coping',
    readTime: 4,
    body: [
      'In a culture that prizes positivity, sadness is often treated as something to overcome as quickly as possible. But research in affective science suggests that sadness serves important psychological functions.',
      'Sadness typically signals loss or disconnection from something meaningful. Unlike depression, sadness is emotionally specific — it points toward something that mattered.',
      'Studies by Joseph Forgas found that people in mildly sad states showed better attention to detail and more careful thinking than people in positive states.',
      'The key distinction is between processing sadness and ruminating. The former tends to lead to emotional integration; the latter tends to maintain or worsen distress.',
      'MoodMap tip: When you log Sadness and write about its cause, you are doing the most important thing — naming it and connecting it to something real. That act alone is a form of emotional processing.',
    ],
  },
  {
    id: 'understanding-and-recovering-from-burnout',
    title: 'Understanding Burnout and Finding a Path Forward',
    subtitle: 'Burnout is more than being tired — it is a state of emotional, mental, and physical exhaustion that develops when stress goes unchecked for too long.',
    emotion: 'Sadness',
    framing: 'coping',
    readTime: 8,
    body: [
      'Burnout develops when chronic stress continues for so long that a person begins to feel emotionally depleted, disconnected from their work, and unable to perform at the level they once could.',
      'Psychologist Christina Maslach identified three common signs of burnout: emotional exhaustion, cynicism or detachment, and a reduced sense of accomplishment.',
      'Burnout often develops gradually. Because many workplaces reward productivity and perseverance, people frequently ignore early warning signs until they become severe.',
      'Burnout affects more than work performance. It can impact physical health, relationships, motivation, and overall life satisfaction.',
      'Recovery often begins by addressing basic needs that have been neglected — sleep, nutrition, movement, and meaningful social connection.',
      'Burnout is not a personal failure. It is often a signal that something in your current situation requires attention.',
      'MoodMap tip: If your entries repeatedly show sadness, exhaustion, or a loss of motivation over several weeks, review them together rather than individually. Burnout often reveals itself through patterns that are easy to miss day by day.',
    ],
  },
  {
    id: 'improving-communication-in-relationships',
    title: 'Improving Communication in Relationships',
    subtitle: 'Healthy communication is not about winning arguments — it is about helping people feel heard, understood, and respected.',
    emotion: 'Sadness',
    framing: 'both',
    readTime: 7,
    body: [
      'Many relationship problems grow from misunderstandings or conversations that leave one or both people feeling unheard. When communication breaks down, it can create distance even between people who deeply care about one another.',
      'One of the most important skills in any relationship is listening with curiosity rather than preparing a response.',
      'Difficult conversations rarely go well when emotions are running high. If a discussion becomes overwhelming, it is okay to pause and return to it later.',
      'Constructive disagreements focus on understanding and problem-solving. Statements such as "I felt hurt when..." often create more productive discussions than accusations that begin with "You always..."',
      'Understanding does not always mean agreement. Feeling understood can reduce resentment and strengthen trust even when people still disagree.',
      'Strong communication is built over time through patience, honesty, and practice. What matters most is a willingness to keep learning and approach difficult conversations with respect.',
      'MoodMap tip: If you frequently journal after arguments or difficult conversations, look for patterns in your entries. You may discover specific emotions or communication habits that appear repeatedly.',
    ],
  },
  {
    id: 'recovering-from-a-breakup',
    title: 'Recovering From a Breakup',
    subtitle: 'Healing after a breakup takes time, self-compassion, and a willingness to build a life that continues to move forward.',
    emotion: 'Sadness',
    framing: 'coping',
    readTime: 8,
    body: [
      'Breakups can be some of the most emotionally difficult experiences people face. The loss of a meaningful connection often brings grief, sadness, confusion, and uncertainty about the future.',
      'There is no universal timeline for healing. Comparing your recovery to someone else\'s can create unnecessary pressure during an already difficult period.',
      'Connection with supportive people can make a significant difference. Friends, family members, or support groups can provide encouragement, perspective, and companionship.',
      'Healing also involves learning how to be alone. Spending time with yourself can create opportunities to reconnect with interests and parts of your identity that may have been overlooked.',
      'Self-compassion is especially important during periods of loss. Treating yourself with the same kindness you would offer a close friend can reduce emotional suffering.',
      'Many people expect a dramatic moment when they finally feel healed. In reality, recovery is often much quieter — you simply notice one day that the pain no longer dominates your thoughts.',
      'MoodMap tip: Track not only difficult emotions but also moments of peace, enjoyment, and personal growth. Recovery often becomes visible when you notice positive experiences gradually appearing more often.',
    ],
  },
  {
    id: 'coping-with-the-loss-of-a-friendship',
    title: 'Coping With the Loss of a Friendship',
    subtitle: 'The end of a close friendship can change your daily life, but healing is possible through connection, routine, and self-compassion.',
    emotion: 'Sadness',
    framing: 'coping',
    readTime: 6,
    body: [
      'Losing a close friendship can be just as painful as other significant losses. When that relationship ends, it is common to grieve not only the person but also the part of your life they shared.',
      'Grief does not always require the loss of a life. Meaningful relationships deserve meaningful space to heal.',
      'Healing often becomes easier when you continue investing in other relationships. New and existing connections can become valuable sources of comfort.',
      'Creating new routines can also help. A friendship often shapes how we spend our free time, so exploring new hobbies or establishing new habits can help fill the space left behind.',
      'Some friendships end because of conflict or betrayal. Forgiveness does not require reconciliation — it is possible to let go of resentment while still recognizing that the relationship needed to end.',
      'Although the loss of a friendship may always remain part of your story, it does not have to define it.',
      'MoodMap tip: If your entries often mention missing one particular person, also record moments when you felt supported by someone else. Seeing new connections develop can remind you that healing often happens one relationship at a time.',
    ],
  },
  {
    id: 'finding-motivation-one-step-at-a-time',
    title: 'Finding Motivation One Step at a Time',
    subtitle: 'Motivation is rarely something you find — it is often something you build through purpose, progress, and small daily actions.',
    emotion: 'Sadness',
    framing: 'growth',
    readTime: 6,
    body: [
      'Everyone experiences periods where motivation feels out of reach. More often, a lack of motivation is a sign that something feels unclear, overwhelming, or disconnected from what matters to you.',
      'Motivation usually has a purpose behind it. Instead of asking "How do I become motivated?" try asking "Why is this worth doing?"',
      'Sometimes that purpose has to be created. Waiting to feel inspired before taking action often keeps us stuck, while creating reasons to begin can help build momentum.',
      'Large tasks have a way of making motivation disappear. Break them into the smallest possible steps and focus only on the next action.',
      'It is also important to recognize the progress you have already made. Taking time to acknowledge small wins can strengthen confidence and make future effort feel worthwhile.',
      'MoodMap tip: If you often journal about putting things off, ask yourself what made the task feel difficult. Understanding the obstacle is often the first step toward rebuilding motivation.',
    ],
  },
  {
    id: 'grieving-the-loss-of-a-loved-one',
    title: 'Grieving the Loss of a Loved One',
    subtitle: 'Grief is a deeply personal journey that cannot be rushed, but healing often grows through connection, remembrance, and compassion.',
    emotion: 'Sadness',
    framing: 'coping',
    readTime: 7,
    body: [
      'Losing someone you love is one of life\'s most painful experiences. Grief can affect your emotions, thoughts, physical health, and daily routines in ways that are difficult to predict.',
      'The stages of grief are not a checklist or a timeline. Many people move between emotions, revisit them repeatedly, or experience them in an entirely different order.',
      'During difficult periods, it can help to lean on the people around you. Simply allowing yourself to be supported can make the burden feel a little lighter.',
      'One meaningful way to keep someone\'s memory alive is through stories, traditions, and shared experiences. Love does not disappear simply because someone is no longer physically present.',
      'Over time, grief often changes rather than disappears. The pain may become less overwhelming, making room for gratitude, laughter, and meaningful memories alongside sadness.',
      'MoodMap tip: When you feel ready, try writing about a favorite memory rather than only the loss itself. Recording moments of love or lessons they taught you can become a meaningful way to honor both their life and your own healing journey.',
    ],
  },
  {
    id: 'building-self-esteem-through-self-acceptance',
    title: 'Building Self-Esteem Through Self-Acceptance',
    subtitle: 'Healthy self-esteem grows from self-compassion, realistic thinking, and recognizing your value beyond comparison.',
    emotion: 'Sadness',
    framing: 'both',
    readTime: 6,
    body: [
      'Low self-esteem can affect the way you see yourself, your abilities, and your future. Fortunately, self-esteem is something that can be strengthened over time.',
      'Healthy self-esteem is built on accepting yourself rather than constantly comparing yourself. Your value is not determined by someone else\'s success.',
      'Self-compassion plays an important role in developing self-esteem. Accepting your imperfections does not lower your standards — it creates a healthier foundation for growth.',
      'Focus on what you can control. Directing your energy toward your effort, your choices, and how you respond to challenges often builds confidence more effectively than worrying about things outside your control.',
      'Take time to recognize your accomplishments, even the small ones. Progress often happens so gradually that it becomes easy to overlook.',
      'Healthy self-esteem is not about believing you are perfect. It is about recognizing that your worth exists even while you continue learning and growing.',
      'MoodMap tip: When reviewing your journal, look for entries that describe accomplishments, acts of kindness, or challenges you overcame. Revisiting these moments can help counter the tendency to focus only on perceived shortcomings.',
    ],
  },
  {
    id: 'replacing-self-criticism-with-self-compassion',
    title: 'Replacing Self-Criticism With Self-Compassion',
    subtitle: 'The way you speak to yourself shapes how you recover from mistakes, face challenges, and view your own worth.',
    emotion: 'Sadness',
    framing: 'growth',
    readTime: 6,
    body: [
      'Many people have an inner voice that is far harsher than they would ever be toward someone they care about. Over time, this pattern of self-criticism can affect confidence, motivation, and emotional well-being.',
      'Self-criticism rarely produces lasting growth. More often, it creates shame, discouragement, and fear of making future mistakes.',
      'One helpful exercise is to imagine a close friend facing the same situation. You would likely offer encouragement, perspective, and patience. Practicing that same kindness toward yourself is not lowering your standards — it is creating a healthier way to meet them.',
      'Self-compassion does not mean avoiding responsibility. It means acknowledging mistakes honestly while remembering that making mistakes is part of being human.',
      'Changing your inner dialogue takes practice. When you notice self-critical thoughts, ask whether they are helpful, accurate, or simply familiar.',
      'You deserve the same patience, understanding, and forgiveness that you would offer someone you care about.',
      'MoodMap tip: Pay attention to the words you use when describing yourself in your journal. If you notice harsh or absolute language, consider how you would rewrite those same thoughts if they were about a close friend.',
    ],
  },

  // ── Disgust ───────────────────────────────────────────────────────────────
  {
    id: 'disgust-boredom',
    title: 'Boredom Is Not Wasted Time',
    subtitle: 'What happens when your mind has nothing to do',
    emotion: 'Disgust',
    framing: 'growth',
    readTime: 3,
    body: [
      'Boredom has a surprisingly positive side. Research found that people who were bored before a creative task performed significantly better on it than those who were not. Boredom activates the default mode network — the part of the brain associated with daydreaming, creativity, and self-reflection.',
      'In an era of constant stimulation, genuine boredom has become rare. Most people fill the slightest gap with their phone, making the creative and reflective benefits of boredom increasingly unavailable.',
      'Boredom also functions as a signal. Like hunger signals the body needs food, boredom often signals that the mind needs either stimulation or rest.',
      'MoodMap tip: When you log Boredom and write about its context, pay attention to where you were and what you were doing. Repeated boredom in the same context is often a signal worth taking seriously.',
    ],
  },
  {
    id: 'embracing-your-own-social-perspective',
    title: 'Embracing Your Own Social Perspective',
    subtitle: 'Your values and opinions do not have to match everyone else\'s for them to be meaningful.',
    emotion: 'Disgust',
    framing: 'both',
    readTime: 6,
    body: [
      'Disgust is often associated with things that feel physically unpleasant, but it also plays an important role in our social lives. It influences how we react to behaviors, values, and situations that conflict with our personal sense of right and wrong.',
      'There may be times when you disagree with behaviors that seem completely normal to the people around you. Having a different opinion does not automatically make you closed-minded or judgmental.',
      'At the same time, it is helpful to remain curious about why other people think differently. Understanding another person\'s perspective does not require agreeing with it.',
      'Groupthink can become a challenge when the desire to fit in becomes stronger than the willingness to think independently.',
      'Being different is not something to hide. Some of the qualities that make people unique are often what allow them to contribute something valuable to the people around them.',
      'Holding your own perspective also comes with responsibility. Stay open to learning, be willing to revise your opinions when presented with new evidence, and treat others with respect even when you disagree.',
      'MoodMap tip: When a situation leaves you feeling frustrated or uncomfortable, ask yourself which personal value was challenged. Understanding the value beneath the emotion can help you respond thoughtfully instead of simply reacting.',
    ],
  },

  // ── Anger ─────────────────────────────────────────────────────────────────
  {
    id: 'anger-understanding',
    title: 'What Anger Is Really Telling You',
    subtitle: 'Using frustration as useful information',
    emotion: 'Anger',
    framing: 'coping',
    readTime: 5,
    body: [
      'Anger is frequently misunderstood as a problem to be eliminated rather than a signal to be understood. From an evolutionary standpoint, anger evolved to alert us to perceived injustice, boundary violations, or threats to things we value.',
      'Research by emotion scientist Lisa Feldman Barrett suggests that anger often arises not from the situation itself but from our prediction that the situation is a threat.',
      'The most useful question to ask when you feel anger is not "why am I so angry?" but "what do I care about that feels threatened right now?"',
      'Chronic anger that is not processed tends to amplify over time. Suppressing anger without addressing its source increases stress markers, while expressing it constructively reduces them.',
      'MoodMap tip: Your journal note when logging Anger or its derivatives is particularly valuable. Over time, patterns in what triggers your anger reveal your deepest values.',
    ],
  },
  {
    id: 'navigating-family-conflict-with-understanding',
    title: 'Navigating Family Conflict With Understanding',
    subtitle: 'Family disagreements are normal, but healthy communication, boundaries, and genuine forgiveness can help relationships heal and grow.',
    emotion: 'Anger',
    framing: 'coping',
    readTime: 6,
    body: [
      'Conflict is a natural part of family life. While conflict itself is not necessarily harmful, unresolved conflict can create lasting tension and emotional distance.',
      'Healthy communication begins with curiosity. Taking time to understand another person\'s perspective can reveal concerns that were never clearly expressed.',
      'Forgiveness cannot be forced. Meaningful forgiveness comes from personal choice and emotional readiness, not obligation.',
      'At the same time, forgiveness does not require forgetting what happened or allowing harmful behavior to continue. It is possible to forgive someone while maintaining healthy boundaries.',
      'Families cope with challenges more effectively when they work together rather than against one another.',
      'Conflict does not mean a family is broken. Growth often happens through disagreements handled with honesty, respect, and care.',
      'MoodMap tip: When writing about family conflict, note both the event and the emotions that followed. Over time, you may discover recurring triggers or communication patterns.',
    ],
  },
  {
    id: 'managing-family-expectations-and-staying-true-to-yourself',
    title: 'Managing Family Expectations and Staying True to Yourself',
    subtitle: 'Balancing family expectations with your own goals can be challenging, but lasting fulfillment comes from living according to your values.',
    emotion: 'Anger',
    framing: 'growth',
    readTime: 6,
    body: [
      'Most families have expectations. While some can be motivating, others may create stress when they conflict with your own goals and values.',
      'Trying to live entirely according to the approval of others can become emotionally exhausting. Building a life around your own values creates a stronger foundation for long-term fulfillment.',
      'Part of managing expectations involves accepting that setbacks and failures are normal. Holding yourself to unrealistic standards can make it difficult to recognize the progress you are already making.',
      'Family relationships often improve when expectations become topics of conversation rather than assumptions.',
      'There may be times when your path differs from what others hoped for you. Choosing a different direction does not necessarily mean you are failing your family.',
      'Your worth is not determined by how closely you match someone else\'s expectations.',
      'MoodMap tip: When feelings of frustration or disappointment appear in your entries, ask yourself whose expectations are driving those emotions. The answer may help clarify whether your goals truly belong to you or to someone else.',
    ],
  },
  {
    id: 'replacing-self-criticism-with-self-compassion-anger',
    title: 'When Your Harshest Critic Is Yourself',
    subtitle: 'Self-directed anger often disguises itself as high standards — but there is a healthier way to grow.',
    emotion: 'Anger',
    framing: 'growth',
    readTime: 6,
    body: [
      'Anger is not always directed outward. Sometimes the harshest version of it turns inward, appearing as relentless self-criticism, shame, or the feeling that you are never quite enough.',
      'Self-directed anger often develops from high expectations, past experiences, or the belief that being hard on yourself is what drives improvement. The problem is that chronic self-criticism rarely produces growth — it more often produces fear and avoidance.',
      'One way to recognize self-directed anger is to notice how you speak to yourself after a mistake. If the language is harsher than anything you would say to a friend, it may be worth examining where those standards came from and whether they are serving you.',
      'Accountability and self-compassion are not opposites. You can take full responsibility for a mistake while still treating yourself with kindness during the process of learning from it.',
      'Anger turned inward can also be a signal that something external needs attention. Sometimes what feels like self-criticism is actually unexpressed frustration about a situation, relationship, or circumstance that has not yet been fully acknowledged.',
      'Redirecting that energy — from harsh internal judgment toward honest self-reflection and constructive action — often produces more meaningful growth than self-punishment ever could.',
      'MoodMap tip: When you notice anger or frustration in your entries, ask whether it is directed outward or inward. Both matter, but they often call for different responses.',
    ],
  },
  {
    id: 'navigating-difficult-coworkers-anger',
    title: 'Handling Workplace Frustration Without Letting It Follow You Home',
    subtitle: 'Anger at work is valid — but learning to process it well protects both your career and your well-being.',
    emotion: 'Anger',
    framing: 'coping',
    readTime: 5,
    body: [
      'Workplace frustration is one of the most common emotional experiences people carry home without realizing it. An unfair decision, a difficult conversation, or repeated small irritations can accumulate into a level of anger that extends well beyond office hours.',
      'The first step is recognizing when work frustration is bleeding into your personal life. Signs include difficulty unwinding after work, replaying conversations in your head, irritability toward people at home, or dreading the next workday before the current one has ended.',
      'Processing work anger effectively often begins with naming it clearly. Rather than "I had a bad day," try identifying the specific situation and the specific value it violated. Injustice, disrespect, lack of recognition, and feeling unheard are common workplace triggers worth naming precisely.',
      'Physical movement is one of the most evidence-supported ways to process anger after a stressful workday. Exercise, a walk, or even brief physical activity can reduce the physiological activation that anger creates, making it easier to think clearly afterward.',
      'Creating a deliberate transition between work and home — a specific ritual that signals the end of the workday — can help prevent work emotions from contaminating personal time. This might be a walk, a podcast, changing clothes, or any consistent activity that marks the shift.',
      'If workplace frustration is chronic rather than occasional, it may be worth examining whether the source is a specific situation, a relationship, or a structural issue in the environment itself. Targeted action is almost always more effective than general stress management.',
      'MoodMap tip: When logging anger after a workday, note whether the frustration feels situational or cumulative. Cumulative entries pointing to the same source over several weeks are often a stronger signal that something needs to change.',
    ],
  },
];

// ── Seasonal content ──────────────────────────────────────────────────────────

interface SeasonalCard {
  id:      string;
  season:  string;
  color:   string;
  title:   string;
  tip:     string;
}

function getCurrentSeason(): string {
  const month = new Date().getMonth() + 1;
  if (month >= 3 && month <= 5)  return 'Spring';
  if (month >= 6 && month <= 8)  return 'Summer';
  if (month >= 9 && month <= 11) return 'Fall';
  return 'Winter';
}

const SEASONAL_CONTENT: SeasonalCard[] = [
  {
    id:     'winter',
    season: 'Winter',
    color:  '#6B9FD4',
    title:  'Winter Tips',
    tip:    'Shorter days can affect mood. Prioritize light exposure in the morning, maintain social connections, and consider a consistent sleep schedule to support your emotional baseline.',
  },
  {
    id:     'spring',
    season: 'Spring',
    color:  '#90C97A',
    title:  'Spring Tips',
    tip:    'Seasonal transitions can bring unexpected mood shifts. Use the renewed energy of longer days to re-establish routines that slipped in winter.',
  },
  {
    id:     'summer',
    season: 'Summer',
    color:  '#FFD700',
    title:  'Summer Tips',
    tip:    'Heat and disrupted routines can affect sleep quality and mood. Protect your sleep environment from light and heat, and be gentle with yourself when summer disrupts your usual rhythm.',
  },
  {
    id:     'fall',
    season: 'Fall',
    color:  '#FFA500',
    title:  'Fall Tips',
    tip:    'The return to routine after summer can bring both relief and stress. Acknowledge the transition and give yourself time to re-adjust rather than expecting immediate productivity.',
  },
];

// ── Common situations ─────────────────────────────────────────────────────────

const COMMON_SITUATIONS = [
  { id: 'breakups',      label: 'Breakups',              color: '#6B9FD4' },
  { id: 'tough-choices', label: 'Tough Choices',         color: '#9B59B6' },
  { id: 'sleep',         label: 'Trouble Sleeping',      color: '#34495E' },
  { id: 'tough-days',    label: 'Tough Days',            color: '#E74C3C' },
  { id: 'work-stress',   label: 'Work Stress',           color: '#E67E22' },
  { id: 'finances',      label: 'Saving for the Future', color: '#27AE60' },
  { id: 'purpose',       label: 'Finding Your Purpose',  color: '#F39C12' },
  { id: 'conversations', label: 'Hard Conversations',    color: '#16A085' },
];

// ── Article modal ─────────────────────────────────────────────────────────────

function ArticleModal({
  article,
  onClose,
}: {
  article: Article;
  onClose: () => void;
}) {
  const { colors } = useTheme();

  const modalStyles = useMemo(
    () => createModalStyles(colors),
    [colors]
  );
  return (
    <Modal visible animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={modalStyles.container}>
        <ScrollView
          contentContainerStyle={modalStyles.scroll}
          showsVerticalScrollIndicator={false}
        >
          <View style={modalStyles.header}>
            <TouchableOpacity style={modalStyles.closeButton} onPress={onClose}>
              <Text style={modalStyles.closeText}>✕</Text>
            </TouchableOpacity>
            <Text style={modalStyles.readTime}>{article.readTime} min read</Text>
          </View>
          <Text style={modalStyles.title}>{article.title}</Text>
          <Text style={modalStyles.subtitle}>{article.subtitle}</Text>
          <View style={modalStyles.divider} />
          {article.body.map((para, i) => (
            <Text key={i} style={modalStyles.body}>{para}</Text>
          ))}
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

const createModalStyles = (colors: any) => 
  StyleSheet.create({
  container: {
    flex:            1,
    backgroundColor: colors.background,
  },
  scroll: {
    padding:       spacing.lg,
    paddingBottom: spacing.xxl,
    gap:           spacing.lg,
  },
  header: {
    flexDirection:  'row',
    alignItems:     'center',
    justifyContent: 'space-between',
  },
  closeButton: {
    width:           36,
    height:          36,
    borderRadius:    radius.full,
    backgroundColor: colors.card,
    alignItems:      'center',
    justifyContent:  'center',
  },
  closeText: {
    color:      colors.white,
    fontSize:   fontSize.md,
    fontWeight: '700',
  },
  readTime: {
    color:    colors.textMuted,
    fontSize: fontSize.sm,
  },
  title: {
    color:      colors.white,
    fontSize:   fontSize.xl,
    fontWeight: '800',
    lineHeight: 32,
  },
  subtitle: {
    color:    colors.textMuted,
    fontSize: fontSize.md,
    lineHeight: 24,
  },
  divider: {
    height:          1,
    backgroundColor: colors.border,
    marginVertical:  spacing.sm,
  },
  body: {
    color:      colors.white,
    fontSize:   fontSize.md,
    lineHeight: 28,
  },
});

// ── Main screen ───────────────────────────────────────────────────────────────

interface Props {
  onClose: () => void;
}

export default function InsightScreen({ onClose }: Props) {
  const { colors } = useTheme();
  const styles = useMemo(
        () => createStyles(colors),
        [colors]
    );
  const [entries, setEntries]                 = useState<PersistedEntry[]>([]);
  const [topEmotion, setTopEmotion]           = useState<string | null>(null);
  const [isDeclining, setIsDeclining]         = useState(false);
  const [selectedArticle, setSelectedArticle] = useState<Article | null>(null);
  const [patternAlert, setPatternAlert]       = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      const result = await store.getAllEntries();
      if (!result.ok) return;

      const all = result.value;
      setEntries(all);

      if (all.length >= 7) {
        // Find most logged emotion in last 30 days
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const cutoff   = thirtyDaysAgo.toISOString().slice(0, 10);
        const recent   = all.filter(e => e.date >= cutoff);
        const emotions = recent.flatMap(e => e.emotions.map(em => em.coreEmotion));
        const counts   = new Map<string, number>();
        emotions.forEach(em => counts.set(em, (counts.get(em) ?? 0) + 1));
        const top = [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
        if (top) setTopEmotion(top);

        // Check trend
        const recentScores = all.slice(0, 14).map(e => e.dailyScore).reverse();
        setIsDeclining(isTrendDeclining(recentScores));
      }

      // Check longitudinal pattern
      // Requires 120+ entries spanning 12+ months
      const entryRecords = all.map(e => ({
        date:       e.date,
        dailyScore: e.dailyScore,
      }));
      const patternResult = checkPattern(entryRecords);
      if (patternResult.qualifies && patternResult.hasPattern && patternResult.alertMessage) {
        setPatternAlert(patternResult.alertMessage);
      }
    }
    loadData();
  }, []);

  // Get recommended articles based on top emotion and trend
  const recommendedArticles = topEmotion
    ? ARTICLES.filter(a => {
        if (a.emotion !== topEmotion) return false;
        if (isDeclining && a.framing === 'growth') return false;
        if (!isDeclining && a.framing === 'coping') return false;
        return true;
      }).concat(
        ARTICLES.filter(a => a.emotion !== topEmotion).slice(0, 2)
      ).slice(0, 4)
    : ARTICLES.slice(0, 3);

  const currentSeasonData = SEASONAL_CONTENT.find(s => s.season === getCurrentSeason())!;
  const hasEnoughData     = entries.length >= 7;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >

        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Text style={styles.closeText}>✕</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Insight</Text>
        </View>

        {/* Longitudinal pattern alert — shown after 12 months of data */}
        {patternAlert && (
          <View style={styles.patternAlertCard}>
            <View style={styles.patternAlertHeader}>
              <Text style={styles.patternAlertIcon}>🔔</Text>
              <Text style={styles.patternAlertTitle}>A Pattern We Noticed</Text>
            </View>
            <Text style={styles.patternAlertText}>{patternAlert}</Text>
            <Text style={styles.patternAlertSub}>
              Based on your entries over the past year.
            </Text>
          </View>
        )}

        {/* Seasonal tip — always shown */}
        <View style={[styles.seasonalCard, { borderColor: currentSeasonData.color }]}>
          <View style={styles.seasonalHeader}>
            <View style={[styles.seasonBadge, { backgroundColor: currentSeasonData.color }]}>
              <Text style={styles.seasonBadgeText}>{currentSeasonData.season}</Text>
            </View>
            <Text style={styles.seasonalTitle}>{currentSeasonData.title}</Text>
          </View>
          <Text style={styles.seasonalTip}>{currentSeasonData.tip}</Text>
        </View>

        {/* Recommended articles */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            {hasEnoughData && topEmotion
              ? `Based on your ${topEmotion} entries`
              : 'Suggested Reading'
            }
          </Text>
          {!hasEnoughData && (
            <Text style={styles.sectionSub}>
              Complete 7 entries to get personalized article recommendations
              based on your most logged emotions.
            </Text>
          )}
          {recommendedArticles.map((article, i) => (
            <TouchableOpacity
              key={article.id}
              style={styles.articleCard}
              onPress={() => setSelectedArticle(article)}
              activeOpacity={0.75}
            >
              <View style={styles.articleNumber}>
                <Text style={styles.articleNumberText}>#{i + 1}</Text>
              </View>
              <View style={styles.articleContent}>
                <Text style={styles.articleTitle}>{article.title}</Text>
                <Text style={styles.articleSubtitle}>{article.subtitle}</Text>
                <Text style={styles.articleMeta}>{article.readTime} min read</Text>
              </View>
              <Text style={styles.articleArrow}>→</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Common situations */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Common Situations</Text>
          <View style={styles.situationsGrid}>
            {COMMON_SITUATIONS.map(sit => (
              <TouchableOpacity
                key={sit.id}
                style={[styles.situationChip, { borderColor: sit.color }]}
                activeOpacity={0.75}
              >
                <Text style={[styles.situationLabel, { color: sit.color }]}>
                  {sit.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Data threshold message */}
        {!hasEnoughData && (
          <View style={styles.thresholdCard}>
            <Text style={styles.thresholdText}>
              {entries.length} of 7 entries completed.
              Keep logging to unlock personalized recommendations.
            </Text>
            <View style={styles.progressBar}>
              <View style={[
                styles.progressFill,
                { width: `${Math.min((entries.length / 7) * 100, 100)}%` },
              ]} />
            </View>
          </View>
        )}

      </ScrollView>

      {/* Article modal */}
      {selectedArticle && (
        <ArticleModal
          article={selectedArticle}
          onClose={() => setSelectedArticle(null)}
        />
      )}

    </SafeAreaView>
  );
}

const createStyles = (colors: any) => 
  StyleSheet.create({
  container: {
    flex:            1,
    backgroundColor: colors.background,
  },
  scroll: {
    padding:       spacing.lg,
    paddingBottom: spacing.xxl,
    gap:           spacing.lg,
  },
  header: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:           spacing.md,
  },
  closeButton: {
    width:           36,
    height:          36,
    borderRadius:    radius.full,
    backgroundColor: colors.card,
    alignItems:      'center',
    justifyContent:  'center',
  },
  closeText: {
    color:      colors.white,
    fontSize:   fontSize.md,
    fontWeight: '700',
  },
  headerTitle: {
    color:      colors.white,
    fontSize:   fontSize.xl,
    fontWeight: '800',
  },

  // Seasonal card
  seasonalCard: {
    backgroundColor: colors.card,
    borderRadius:    radius.lg,
    padding:         spacing.lg,
    borderWidth:     2,
    gap:             spacing.md,
  },
  seasonalHeader: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:           spacing.sm,
  },
  seasonBadge: {
    paddingHorizontal: spacing.md,
    paddingVertical:   spacing.xs,
    borderRadius:      radius.full,
  },
  seasonBadgeText: {
    color:      colors.textDark,
    fontSize:   fontSize.xs,
    fontWeight: '700',
  },
  seasonalTitle: {
    color:      colors.white,
    fontSize:   fontSize.md,
    fontWeight: '700',
  },
  seasonalTip: {
    color:      colors.white,
    fontSize:   fontSize.sm,
    lineHeight: 22,
  },

  // Articles
  section: {
    gap: spacing.md,
  },
  sectionTitle: {
    color:      colors.white,
    fontSize:   fontSize.md,
    fontWeight: '700',
  },
  sectionSub: {
    color:      colors.textMuted,
    fontSize:   fontSize.sm,
    lineHeight: 20,
    marginTop:  -spacing.sm,
  },
  articleCard: {
    flexDirection:   'row',
    alignItems:      'center',
    backgroundColor: colors.card,
    borderRadius:    radius.lg,
    padding:         spacing.md,
    borderWidth:     1,
    borderColor:     colors.border,
    gap:             spacing.md,
  },
  articleNumber: {
    width:           36,
    height:          36,
    borderRadius:    radius.full,
    backgroundColor: colors.purple,
    alignItems:      'center',
    justifyContent:  'center',
    flexShrink:      0,
  },
  articleNumberText: {
    color:      colors.white,
    fontSize:   fontSize.xs,
    fontWeight: '800',
  },
  articleContent: {
    flex: 1,
    gap:  2,
  },
  articleTitle: {
    color:      colors.white,
    fontSize:   fontSize.sm,
    fontWeight: '700',
  },
  articleSubtitle: {
    color:    colors.textMuted,
    fontSize: fontSize.xs,
    lineHeight: 18,
  },
  articleMeta: {
    color:      colors.purpleLight,
    fontSize:   fontSize.xs,
    marginTop:  spacing.xs,
    fontWeight: '600',
  },
  articleArrow: {
    color:      colors.purpleLight,
    fontSize:   fontSize.lg,
    fontWeight: '700',
  },

  // Common situations
  situationsGrid: {
    flexDirection: 'row',
    flexWrap:      'wrap',
    gap:           spacing.sm,
  },
  situationChip: {
    paddingHorizontal: spacing.md,
    paddingVertical:   spacing.sm,
    borderRadius:      radius.full,
    borderWidth:       1.5,
    backgroundColor:   colors.card,
  },
  situationLabel: {
    fontSize:   fontSize.sm,
    fontWeight: '600',
  },

  // Threshold progress
  thresholdCard: {
    backgroundColor: colors.card,
    borderRadius:    radius.lg,
    padding:         spacing.lg,
    gap:             spacing.md,
    borderWidth:     1,
    borderColor:     colors.border,
  },
  thresholdText: {
    color:      colors.textMuted,
    fontSize:   fontSize.sm,
    lineHeight: 20,
    textAlign:  'center',
  },
  progressBar: {
    height:          6,
    backgroundColor: colors.border,
    borderRadius:    radius.full,
    overflow:        'hidden',
  },
  progressFill: {
    height:          '100%',
    backgroundColor: colors.purple,
    borderRadius:    radius.full,
  },
  patternAlertCard: {
    backgroundColor: 'rgba(107,79,160,0.15)',
    borderRadius:    radius.lg,
    padding:         spacing.lg,
    borderWidth:     1.5,
    borderColor:     colors.purple,
    gap:             spacing.md,
  },
  patternAlertHeader: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:           spacing.sm,
  },
  patternAlertIcon: {
    fontSize: 20,
  },
  patternAlertTitle: {
    color:      colors.white,
    fontSize:   fontSize.md,
    fontWeight: '700',
  },
  patternAlertText: {
    color:      colors.white,
    fontSize:   fontSize.sm,
    lineHeight: 22,
  },
  patternAlertSub: {
    color:     colors.textMuted,
    fontSize:  fontSize.xs,
    fontStyle: 'italic',
  },
});