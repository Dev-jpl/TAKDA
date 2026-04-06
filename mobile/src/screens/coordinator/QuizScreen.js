import React, { useState, useEffect, useRef } from 'react';
import { 
  View, Text, StyleSheet, TouchableOpacity, 
  ScrollView, ActivityIndicator, TextInput,
  Animated, Dimensions
} from 'react-native';
import { colors } from '../../constants/colors';
import { coordinatorService } from '../../services/coordinator';
import { ASSISTANT_NAME } from '../../constants/brand';
import { X, Check, ArrowRight, Trophy, BookOpen } from 'phosphor-react-native';

const { width } = Dimensions.get('window');

export default function AssistantQuiz({ route, navigation }) {
  const { quizId, userId } = route.params;
  const [loading, setLoading] = useState(true);
  const [quiz, setQuiz] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [result, setResult] = useState(null);
  
  const progressAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    loadQuiz();
  }, []);

  useEffect(() => {
    if (questions.length > 0) {
      Animated.timing(progressAnim, {
        toValue: (currentIndex + 1) / questions.length,
        duration: 300,
        useNativeDriver: false
      }).start();
    }
  }, [currentIndex, questions]);

  const loadQuiz = async () => {
    try {
      const data = await coordinatorService.getQuiz(quizId);
      setQuiz(data.quiz);
      setQuestions(data.questions);
    } catch (e) {
      console.warn('Load quiz error:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleAnswer = (val) => {
    setAnswers(prev => ({ ...prev, [questions[currentIndex].id]: val }));
  };

  const nextQuestion = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(prev => prev + 1);
    } else {
      handleSubmit();
    }
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const res = await coordinatorService.submitQuiz(quizId, userId || '0000', answers);
      setResult(res);
      setSubmitted(true);
    } catch (e) {
      console.warn('Submit quiz error:', e);
    } finally {
      setLoading(false);
    }
  };

  if (loading && !quiz) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={colors.modules.aly} />
        <Text style={styles.loadingText}>Calibrating Learning Engine...</Text>
      </View>
    );
  }

  if (submitted && result) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <X size={24} color={colors.text.primary} />
          </TouchableOpacity>
        </View>
        <ScrollView contentContainerStyle={styles.resultContainer}>
          <View style={styles.trophyCircle}>
            <Trophy size={48} color="#fff" weight="fill" />
          </View>
          <Text style={styles.resultTitle}>QUIZ COMPLETE</Text>
          <View style={styles.scoreCard}>
            <Text style={styles.scoreText}>{result.score}</Text>
            <Text style={styles.scoreTotal}>/ {result.total_points}</Text>
          </View>
          <Text style={styles.resultHint}>
            Great synchronization! You have internalized {Math.round((result.score / result.total_points) * 100)}% of the target knowledge.
          </Text>
          <TouchableOpacity style={styles.finishBtn} onPress={() => navigation.goBack()}>
            <Text style={styles.finishBtnText}>RETURN TO {ASSISTANT_NAME.toUpperCase()}</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    );
  }

  const currentQ = questions[currentIndex];
  if (!currentQ) return null;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <X size={24} color={colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{quiz?.title || 'Knowledge Audit'}</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={styles.progressBarBg}>
        <Animated.View 
          style={[styles.progressBar, { width: progressAnim.interpolate({
            inputRange: [0, 1],
            outputRange: ['0%', '100%']
          }) }]} 
        />
      </View>

      <ScrollView contentContainerStyle={styles.quizContent}>
        <Text style={styles.qIndex}>QUESTION {currentIndex + 1} OF {questions.length}</Text>
        <Text style={styles.questionText}>{currentQ.question}</Text>

        <View style={styles.answerArea}>
          {currentQ.type === 'multiple_choice' && (
            <View style={styles.optionsList}>
              {currentQ.options.map((opt, i) => {
                const isSelected = answers[currentQ.id] === opt;
                return (
                  <TouchableOpacity 
                    key={i} 
                    style={[styles.optionBtn, isSelected && styles.optionBtnActive]}
                    onPress={() => handleAnswer(opt)}
                  >
                    <View style={[styles.radio, isSelected && styles.radioActive]}>
                      {isSelected && <View style={styles.radioInner} />}
                    </View>
                    <Text style={[styles.optionText, isSelected && styles.optionTextActive]}>{opt}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}

          {currentQ.type === 'boolean' && (
            <View style={styles.boolRow}>
              {['True', 'False'].map((val) => {
                const isSelected = answers[currentQ.id] === val;
                return (
                  <TouchableOpacity 
                    key={val} 
                    style={[styles.boolBtn, isSelected && styles.boolBtnActive]}
                    onPress={() => handleAnswer(val)}
                  >
                    <Text style={[styles.boolText, isSelected && styles.boolTextActive]}>{val}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}

          {(currentQ.type === 'essay' || currentQ.type === 'paragraph') && (
            <TextInput
              style={styles.longInput}
              placeholder="Synthesize your response..."
              placeholderTextColor={colors.text.tertiary}
              multiline
              value={answers[currentQ.id] || ''}
              onChangeText={handleAnswer}
            />
          )}
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity 
          style={[styles.nextBtn, !answers[currentQ.id] && styles.nextBtnDisabled]} 
          onPress={nextQuestion}
          disabled={!answers[currentQ.id] || loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Text style={styles.nextBtnText}>
                {currentIndex === questions.length - 1 ? 'Submit' : 'Next'}
              </Text>
              <ArrowRight size={18} color="#fff" weight="bold" />
            </>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  loading: {
    flex: 1,
    backgroundColor: colors.background.primary,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  loadingText: {
    color: colors.text.secondary,
    fontSize: 14,
    letterSpacing: 0.5,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  headerTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text.primary,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  progressBarBg: {
    height: 4,
    backgroundColor: colors.background.tertiary,
    width: '100%',
  },
  progressBar: {
    height: '100%',
    backgroundColor: colors.modules.aly,
  },
  quizContent: {
    padding: 24,
  },
  qIndex: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.modules.aly,
    letterSpacing: 1.5,
    marginBottom: 12,
  },
  questionText: {
    fontSize: 22,
    color: colors.text.primary,
    fontWeight: '600',
    lineHeight: 30,
    marginBottom: 40,
  },
  answerArea: {
    gap: 16,
  },
  optionsList: {
    gap: 12,
  },
  optionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background.secondary,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border.primary,
  },
  optionBtnActive: {
    borderColor: colors.modules.aly,
    backgroundColor: colors.modules.aly + '10',
  },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: colors.border.primary,
    marginRight: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioActive: {
    borderColor: colors.modules.aly,
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.modules.aly,
  },
  optionText: {
    fontSize: 16,
    color: colors.text.secondary,
    flex: 1,
  },
  optionTextActive: {
    color: colors.text.primary,
    fontWeight: '500',
  },
  boolRow: {
    flexDirection: 'row',
    gap: 12,
  },
  boolBtn: {
    flex: 1,
    height: 60,
    backgroundColor: colors.background.secondary,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border.primary,
  },
  boolBtnActive: {
    borderColor: colors.modules.aly,
    backgroundColor: colors.modules.aly + '10',
  },
  boolText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.secondary,
  },
  boolTextActive: {
    color: colors.text.primary,
  },
  longInput: {
    backgroundColor: colors.background.secondary,
    borderRadius: 16,
    padding: 16,
    height: 200,
    color: colors.text.primary,
    fontSize: 16,
    textAlignVertical: 'top',
    borderWidth: 1,
    borderColor: colors.border.primary,
  },
  footer: {
    padding: 24,
    paddingBottom: 40,
    borderTopWidth: 0.5,
    borderTopColor: colors.border.primary,
  },
  nextBtn: {
    height: 56,
    backgroundColor: colors.modules.aly,
    borderRadius: 28,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  nextBtnDisabled: {
    opacity: 0.5,
  },
  nextBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  resultContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    gap: 20,
  },
  trophyCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: colors.modules.aly,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  resultTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.modules.aly,
    letterSpacing: 2,
  },
  scoreCard: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  scoreText: {
    fontSize: 80,
    fontWeight: '800',
    color: colors.text.primary,
  },
  scoreTotal: {
    fontSize: 24,
    color: colors.text.tertiary,
    fontWeight: '600',
  },
  resultHint: {
    fontSize: 14,
    color: colors.text.secondary,
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: 20,
  },
  finishBtn: {
    marginTop: 20,
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 25,
    borderWidth: 1,
    borderColor: colors.border.primary,
  },
  finishBtnText: {
    color: colors.text.primary,
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 1,
  }
});
