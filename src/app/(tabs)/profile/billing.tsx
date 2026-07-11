import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Modal,
  Dimensions,
  Animated,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
// @ts-ignore
// eslint-disable-next-line import/no-unresolved
import { Ionicons } from '@expo/vector-icons';
import { useToastContext, useThemeContext } from '@/providers';
import { useTranslation } from '@/localization';
import { useUserStore } from '@/store/user';
import { BillingService } from '@/services/billing.service';

const { width } = Dimensions.get('window');

const PLANS = [
  {
    id: 'starter_plan',
    name: 'AI Legal Starter',
    priceMonthly: 499,
    priceYearly: 4990,
    badge: 'STARTER',
    description: 'Unlock core automated legal tools for your practice.',
    features: [
      'Unlimited Draft Maker',
      'Unlimited Court Prep Workspace',
      'Unlimited Legal Precedent Research',
      'Unlimited Evidence Analysis',
      'Unlimited Contract Review',
      'Unlimited Case Predictor',
      'Unlimited Strategy Engine',
      'AI Mock Courtroom (2 Simulations)',
      'AI Client Connect (2 Conversations)',
      'Knowledge Hub (2 Sessions)',
    ],
  },
  {
    id: 'professional_plan',
    name: 'AI Legal Professional',
    priceMonthly: 999,
    priceYearly: 9990,
    badge: 'PRO',
    description: 'Best for active advocates practicing mock trials.',
    isPopular: true,
    features: [
      'Everything in Starter',
      'Unlimited AI Mock Courtroom',
      'AI Client Connect (2 Conversations)',
      'Knowledge Hub (2 Sessions)',
    ],
  },
  {
    id: 'enterprise_plan',
    name: 'AI Legal Enterprise',
    priceMonthly: 2399,
    priceYearly: 23990,
    badge: 'ENTERPRISE',
    description: 'Unlimited access to the entire AI legal ecosystem.',
    features: [
      'Everything Unlimited',
      'Unlimited Knowledge Hub',
      'Unlimited Client Connect',
      'Priority Processing',
      'Premium Support & Custom Templates',
    ],
  },
];

export default function SubscriptionPlansScreen() {
  const router = useRouter();
  const { showToast } = useToastContext();
  const { theme, isDark } = useThemeContext();
  const { t } = useTranslation();

  const profile = useUserStore((s) => s.profile);
  const setProfile = useUserStore((s) => s.setProfile);

  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');
  const [selectedPlan, setSelectedPlan] = useState<typeof PLANS[0] | null>(null);
  const [loading, setLoading] = useState(false);
  
  // Checkout Modal State
  const [checkoutVisible, setCheckoutVisible] = useState(false);
  const [createdOrder, setCreatedOrder] = useState<any>(null);
  const [paymentMethod, setPaymentMethod] = useState<'options' | 'qr'>('options');
  
  // Success / Failure Modals
  const [paymentSuccessVisible, setPaymentSuccessVisible] = useState(false);
  const [paymentFailedVisible, setPaymentFailedVisible] = useState(false);

  // Animation values
  const [fadeAnim] = useState(new Animated.Value(0));

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();
  }, []);

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(tabs)/profile');
    }
  };

  const handleSelectPlan = async (plan: typeof PLANS[0]) => {
    setSelectedPlan(plan);
    setLoading(true);
    setPaymentMethod('options');
    try {
      // Step 1: Create Razorpay Order on the backend
      const res = await BillingService.createSubscriptionOrder(plan.id, billingCycle);
      const data = (res as any)?.data ?? res;

      if (data?.isFree) {
        // Free plan — skip checkout, go directly to verification
        const verifyRes = await BillingService.verifySubscriptionPayment({
          razorpay_order_id: `order_free_${Date.now()}`,
          razorpay_payment_id: `pay_free_${Date.now()}`,
          razorpay_signature: 'mock_signature',
          planId: plan.id,
          billingCycle,
        });
        const verifyData = (verifyRes as any)?.data ?? verifyRes;
        if (verifyData?.user) {
          setProfile(verifyData.user);
          setPaymentSuccessVisible(true);
        }
        return;
      }

      if (data?.order) {
        setCreatedOrder(data.order);
        setCheckoutVisible(true);
      } else {
        showToast('error', 'Order Generation Failed', 'Could not initialize payment order.');
      }
    } catch (err: any) {
      console.error('[handleSelectPlan]', err);
      showToast('error', 'Error', err.message || 'Network error occurred.');
    } finally {
      setLoading(false);
    }
  };

  const simulatePaymentSuccess = async () => {
    if (!selectedPlan) return;
    setCheckoutVisible(false);
    setPaymentMethod('options');
    setLoading(true);
    try {
      // Step 2: Call Backend Verification
      const orderId = createdOrder?.id || `order_mock_${Date.now()}`;
      const res = await BillingService.verifySubscriptionPayment({
        razorpay_order_id: orderId,
        razorpay_payment_id: `pay_mock_${Date.now()}`,
        razorpay_signature: 'mock_signature',
        planId: selectedPlan.id,
        billingCycle,
      });

      const data = (res as any)?.data ?? res;
      if (data?.user) {
        // Step 3: Refresh User state
        setProfile(data.user);
        setPaymentSuccessVisible(true);
      } else {
        setPaymentFailedVisible(true);
      }
    } catch (err) {
      console.error('[simulatePaymentSuccess]', err);
      setPaymentFailedVisible(true);
    } finally {
      setLoading(false);
    }
  };

  const simulatePaymentCancel = () => {
    setCheckoutVisible(false);
    setPaymentMethod('options');
    setPaymentFailedVisible(true);
  };

  const handleRestore = async () => {
    setLoading(true);
    try {
      const res = await BillingService.restoreSubscription();
      if (res.success && res.data) {
        setProfile(res.data.user);
        showToast('success', 'Subscription Restored', res.message || 'Your premium plan is now active.');
      } else {
        showToast('info', 'No Active Subscription', res.message || 'Could not find any active premium records.');
      }
    } catch (err: any) {
      showToast('error', 'Failed', err.message || 'Could not restore purchase.');
    } finally {
      setLoading(false);
    }
  };

  const activePlan = profile?.subscription?.plan || 'FREE';
  const isActivePaid = activePlan !== 'FREE' && profile?.subscription?.status === 'active';

  const formatPlanName = (pName: string) => {
    if (pName === 'FREE') return 'Free Tier';
    if (pName === 'STARTER') return 'AI Legal Starter';
    if (pName === 'PROFESSIONAL') return 'AI Legal Professional';
    if (pName === 'ENTERPRISE') return 'AI Legal Enterprise';
    return pName;
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      {/* HEADER */}
      <View style={[styles.header, { borderBottomColor: theme.border, backgroundColor: theme.surface }]}>
        <Pressable onPress={handleBack} style={styles.backButton}>
          <Ionicons name="chevron-back" size={24} color={theme.primary} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: theme.textPrimary }]}>AI Legal Pro</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {isActivePaid ? (
          // =================== PAID USER VIEW ===================
          <Animated.View style={{ opacity: fadeAnim }}>
            <View style={[styles.activePlanCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
              <View style={styles.planHeaderRow}>
                <View>
                  <Text style={[styles.cardLabel, { color: theme.textMuted }]}>CURRENT ACTIVE PLAN</Text>
                  <Text style={[styles.planTitle, { color: theme.textPrimary }]}>{formatPlanName(activePlan)}</Text>
                </View>
                <View style={[styles.badgeContainer, { backgroundColor: theme.primaryLight, borderColor: theme.primary }]}>
                  <Ionicons name="ribbon" size={14} color={theme.primary} style={{ marginRight: 4 }} />
                  <Text style={[styles.badgeText, { color: theme.primary }]}>{activePlan}</Text>
                </View>
              </View>

              <View style={[styles.divider, { backgroundColor: theme.divider }]} />

              <View style={styles.detailRow}>
                <View style={styles.detailItem}>
                  <Text style={[styles.detailLabel, { color: theme.textMuted }]}>Expires On</Text>
                  <Text style={[styles.detailValue, { color: theme.textPrimary }]}>
                    {profile?.subscription?.expiryDate
                      ? new Date(profile.subscription.expiryDate).toLocaleDateString('en-GB', {
                          day: 'numeric',
                          month: 'long',
                          year: 'numeric',
                        })
                      : 'N/A'}
                  </Text>
                </View>
                <View style={styles.detailItem}>
                  <Text style={[styles.detailLabel, { color: theme.textMuted }]}>Billing Amount</Text>
                  <Text style={[styles.detailValue, { color: theme.textPrimary }]}>
                    ₹{profile?.subscription?.amount || 0} / month
                  </Text>
                </View>
              </View>

              <View style={[styles.divider, { backgroundColor: theme.divider }]} />

              <View style={styles.paymentInfoRow}>
                <Ionicons name="card-outline" size={20} color={theme.textSecondary} />
                <View style={{ marginLeft: 12 }}>
                  <Text style={[styles.gatewayLabel, { color: theme.textPrimary }]}>Gateway: {profile?.subscription?.gateway || 'Razorpay'}</Text>
                  <Text style={[styles.invoiceText, { color: theme.textMuted }]}>Invoice: {profile?.subscription?.invoice || 'N/A'}</Text>
                </View>
              </View>
            </View>

            <Text style={[styles.sectionHeading, { color: theme.textPrimary }]}>Subscription Actions</Text>
            
            <View style={[styles.actionGrid, { backgroundColor: theme.card, borderColor: theme.border }]}>
              <Pressable
                style={({ pressed }) => [styles.actionRow, pressed && { backgroundColor: theme.surfaceVariant }]}
                onPress={() => Alert.alert('Manage Plan', 'To upgrade or change your cycle, select a new plan below.')}
              >
                <View style={styles.actionLeft}>
                  <Ionicons name="arrow-up-circle-outline" size={20} color={theme.primary} />
                  <Text style={[styles.actionText, { color: theme.textPrimary }]}>Upgrade Membership</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={theme.textMuted} />
              </Pressable>
              
              <View style={[styles.divider, { backgroundColor: theme.divider }]} />

              <Pressable
                style={({ pressed }) => [styles.actionRow, pressed && { backgroundColor: theme.surfaceVariant }]}
                onPress={handleRestore}
              >
                <View style={styles.actionLeft}>
                  <Ionicons name="refresh-outline" size={20} color={theme.primary} />
                  <Text style={[styles.actionText, { color: theme.textPrimary }]}>Restore Purchase</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={theme.textMuted} />
              </Pressable>
            </View>
          </Animated.View>
        ) : (
          // =================== FREE USER VIEW ===================
          <Animated.View style={[styles.freeHeader, { opacity: fadeAnim }]}>
            <View style={[styles.freeBadge, { backgroundColor: 'rgba(239, 68, 68, 0.08)', borderColor: theme.danger }]}>
              <Text style={[styles.freeBadgeText, { color: theme.danger }]}>CURRENT PLAN: FREE</Text>
            </View>
            <Text style={[styles.upgradeTitle, { color: theme.textPrimary }]}>Upgrade to AI Legal Pro</Text>
            <Text style={[styles.upgradeSubtitle, { color: theme.textSecondary }]}>
              Choose the plan that fits your legal workflow. Unlock premium legal intelligence.
            </Text>
          </Animated.View>
        )}

        {/* PLANS CYCLE SELECTOR */}
        <View style={[styles.cycleContainer, { backgroundColor: theme.surfaceVariant }]}>
          <Pressable
            style={[styles.cycleButton, billingCycle === 'monthly' && { backgroundColor: theme.primary }]}
            onPress={() => setBillingCycle('monthly')}
          >
            <Text style={[styles.cycleText, billingCycle === 'monthly' ? { color: '#FFFFFF', fontWeight: '800' } : { color: theme.textSecondary }]}>
              Monthly
            </Text>
          </Pressable>
          <Pressable
            style={[styles.cycleButton, billingCycle === 'yearly' && { backgroundColor: theme.primary }]}
            onPress={() => setBillingCycle('yearly')}
          >
            <View style={styles.yearlyLabelRow}>
              <Text style={[styles.cycleText, billingCycle === 'yearly' ? { color: '#FFFFFF', fontWeight: '800' } : { color: theme.textSecondary }]}>
                Yearly
              </Text>
              <View style={styles.saveBadge}>
                <Text style={styles.saveBadgeText}>SAVE 15%</Text>
              </View>
            </View>
          </Pressable>
        </View>

        {/* PLAN LISTING */}
        {PLANS.map((plan) => {
          const isCurrentPlan = activePlan === plan.badge;
          const planPrice = billingCycle === 'yearly' ? plan.priceYearly : plan.priceMonthly;
          
          return (
            <View
              key={plan.id}
              style={[
                styles.planCard,
                { backgroundColor: theme.card, borderColor: theme.border },
                plan.isPopular && { borderColor: theme.primary, borderWidth: 2 },
              ]}
            >
              {plan.isPopular && (
                <View style={[styles.popularBadge, { backgroundColor: theme.primary }]}>
                  <Text style={styles.popularBadgeText}>⭐ MOST POPULAR</Text>
                </View>
              )}
              {plan.badge === 'ENTERPRISE' && (
                <View style={[styles.popularBadge, { backgroundColor: '#F59E0B' }]}>
                  <Text style={styles.popularBadgeText}>👑 PREMIUM TIER</Text>
                </View>
              )}

              <View style={styles.planHeader}>
                <Text style={[styles.planNameText, { color: theme.textPrimary }]}>{plan.name}</Text>
                <Text style={[styles.planDescription, { color: theme.textSecondary }]}>{plan.description}</Text>
              </View>

              <View style={styles.priceSection}>
                <Text style={[styles.priceText, { color: theme.textPrimary }]}>₹{planPrice}</Text>
                <Text style={[styles.cycleLabel, { color: theme.textMuted }]}>
                  / {billingCycle === 'yearly' ? 'year' : 'month'}
                </Text>
              </View>

              <View style={[styles.divider, { backgroundColor: theme.divider }]} />

              <View style={styles.featuresList}>
                {plan.features.map((feat, idx) => (
                  <View key={idx} style={styles.featureItem}>
                    <Ionicons name="checkmark-circle" size={16} color={theme.primary} style={{ marginRight: 8 }} />
                    <Text style={[styles.featureText, { color: theme.textSecondary }]}>{feat}</Text>
                  </View>
                ))}
              </View>

              <Pressable
                style={({ pressed }) => [
                  styles.subscribeButton,
                  { backgroundColor: theme.primary },
                  isCurrentPlan && { backgroundColor: theme.surfaceVariant },
                  pressed && { opacity: 0.8 },
                ]}
                onPress={() => !isCurrentPlan && handleSelectPlan(plan)}
                disabled={isCurrentPlan || loading}
              >
                {loading && selectedPlan?.id === plan.id ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={[styles.subscribeButtonText, isCurrentPlan && { color: theme.textMuted }]}>
                    {isCurrentPlan ? 'Active Plan' : plan.badge === 'STARTER' ? 'Subscribe' : 'Continue with Razorpay'}
                  </Text>
                )}
              </Pressable>
            </View>
          );
        })}
      </ScrollView>

      {/* ==================== MOCK RAZORPAY CHECKOUT MODAL ==================== */}
      <Modal visible={checkoutVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.checkoutContainer, { backgroundColor: theme.card }]}>
            <View style={[styles.checkoutHeader, { borderBottomColor: theme.border, alignItems: 'center' }]}>
              <View style={styles.merchantInfo}>
                <Text style={[styles.merchantName, { color: theme.textPrimary }]}>Razorpay Secure QR</Text>
                <Text style={[styles.merchantDesc, { color: theme.textSecondary }]}>Plan: {selectedPlan?.name}</Text>
              </View>
              <Pressable onPress={simulatePaymentCancel}>
                <Ionicons name="close" size={24} color={theme.textSecondary} />
              </Pressable>
            </View>

            <View style={styles.checkoutBody}>
              <View style={[styles.amountBox, { backgroundColor: theme.surfaceVariant }]}>
                <Text style={[styles.amountLabel, { color: theme.textMuted }]}>AMOUNT TO PAY</Text>
                <Text style={[styles.amountText, { color: theme.textPrimary }]}>
                  ₹{billingCycle === 'yearly' ? selectedPlan?.priceYearly : selectedPlan?.priceMonthly}
                </Text>
              </View>

              <View style={styles.qrContainer}>
                <View style={styles.qrCodeMatrix}>
                  <View style={[styles.qrCorner, { top: 12, left: 12 }]} />
                  <View style={[styles.qrCorner, { top: 12, right: 12 }]} />
                  <View style={[styles.qrCorner, { bottom: 12, left: 12 }]} />
                  <View style={{ width: 120, height: 120, borderStyle: 'dashed', borderWidth: 2, borderColor: '#374151', borderRadius: 8, alignItems: 'center', justifyContent: 'center' }}>
                    <Ionicons name="qr-code" size={54} color="#111827" />
                    <Text style={{ fontSize: 9, fontWeight: '800', color: '#4B5563', marginTop: 4 }}>RAZORPAY SECURE</Text>
                  </View>
                </View>
                
                <Text style={[styles.qrInstructions, { color: theme.textSecondary }]}>
                  Scan this QR using Google Pay, PhonePe, Paytm or any UPI App to complete your payment of <Text style={{ fontWeight: '800', color: theme.textPrimary }}>₹{billingCycle === 'yearly' ? selectedPlan?.priceYearly : selectedPlan?.priceMonthly}</Text>.
                </Text>
                
                <Text style={styles.qrTimer}>Expires in 04:59</Text>

                <Pressable
                  style={[styles.qrPayBtn, { backgroundColor: theme.primary }]}
                  onPress={simulatePaymentSuccess}
                >
                  <Text style={styles.qrPayBtnText}>Simulate Webhook Success (Verify Payment)</Text>
                </Pressable>
              </View>
            </View>

            <View style={styles.checkoutFooter}>
              <Pressable style={[styles.cancelBtn, { borderColor: theme.border }]} onPress={simulatePaymentCancel}>
                <Text style={[styles.cancelBtnText, { color: theme.textSecondary }]}>Cancel Payment</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* ==================== PAYMENT SUCCESS ANIMATION MODAL ==================== */}
      <Modal visible={paymentSuccessVisible} transparent animationType="fade">
        <View style={styles.feedbackOverlay}>
          <View style={[styles.feedbackCard, { backgroundColor: theme.card }]}>
            <View style={[styles.successIconWrapper, { backgroundColor: 'rgba(16, 185, 129, 0.1)' }]}>
              <Ionicons name="checkmark-circle" size={60} color="#10B981" />
            </View>
            <Text style={[styles.feedbackTitle, { color: theme.textPrimary }]}>🎉</Text>
            <Text style={[styles.feedbackSubtitle, { color: theme.textPrimary, fontWeight: '800' }]}>
              Welcome to AI Legal Pro
            </Text>
            <Text style={[styles.feedbackDesc, { color: theme.textSecondary }]}>
              {selectedPlan?.badge} Plan Activated Successfully
            </Text>
            <Pressable
              style={[styles.feedbackButton, { backgroundColor: theme.primary }]}
              onPress={() => {
                setPaymentSuccessVisible(false);
                router.replace('/(tabs)/profile');
              }}
            >
              <Text style={styles.feedbackButtonText}>Go to Profile</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* ==================== PAYMENT FAILED MODAL ==================== */}
      <Modal visible={paymentFailedVisible} transparent animationType="fade">
        <View style={styles.feedbackOverlay}>
          <View style={[styles.feedbackCard, { backgroundColor: theme.card }]}>
            <View style={[styles.successIconWrapper, { backgroundColor: 'rgba(239, 68, 68, 0.1)' }]}>
              <Ionicons name="close-circle" size={60} color="#EF4444" />
            </View>
            <Text style={[styles.feedbackSubtitle, { color: theme.textPrimary, fontWeight: '800', marginTop: 12 }]}>
              Payment Cancelled
            </Text>
            <Text style={[styles.feedbackDesc, { color: theme.textSecondary, textAlign: 'center', marginTop: 8 }]}>
              Your subscription has not been activated.
            </Text>
            <Pressable
              style={[styles.feedbackButton, { backgroundColor: theme.primary }]}
              onPress={() => setPaymentFailedVisible(false)}
            >
              <Text style={styles.feedbackButtonText}>Close</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    height: 56,
    borderBottomWidth: 1,
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
  },
  scrollContent: {
    padding: 16,
  },
  activePlanCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginBottom: 20,
  },
  planHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
  },
  planTitle: {
    fontSize: 20,
    fontWeight: '800',
    marginTop: 4,
  },
  badgeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  divider: {
    height: 1,
    marginVertical: 16,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  detailItem: {
    flex: 1,
  },
  detailLabel: {
    fontSize: 11,
    fontWeight: '600',
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '700',
    marginTop: 4,
  },
  paymentInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  gatewayLabel: {
    fontSize: 13,
    fontWeight: '700',
  },
  invoiceText: {
    fontSize: 11,
    marginTop: 2,
  },
  sectionHeading: {
    fontSize: 14,
    fontWeight: '800',
    marginBottom: 10,
    textTransform: 'uppercase',
  },
  actionGrid: {
    borderRadius: 16,
    borderWidth: 1,
    paddingVertical: 8,
    marginBottom: 24,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  actionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionText: {
    fontSize: 14,
    fontWeight: '700',
    marginLeft: 12,
  },
  freeHeader: {
    alignItems: 'center',
    marginVertical: 20,
  },
  freeBadge: {
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    marginBottom: 10,
  },
  freeBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
  },
  upgradeTitle: {
    fontSize: 24,
    fontWeight: '800',
    textAlign: 'center',
  },
  upgradeSubtitle: {
    fontSize: 14,
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 20,
    paddingHorizontal: 20,
  },
  cycleContainer: {
    flexDirection: 'row',
    borderRadius: 24,
    padding: 4,
    marginBottom: 24,
  },
  cycleButton: {
    flex: 1,
    height: 38,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cycleText: {
    fontSize: 13,
    fontWeight: '700',
  },
  yearlyLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  saveBadge: {
    backgroundColor: '#10B981',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    marginLeft: 6,
  },
  saveBadgeText: {
    color: '#FFFFFF',
    fontSize: 8,
    fontWeight: '900',
  },
  planCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 24,
    marginBottom: 20,
    position: 'relative',
    overflow: 'hidden',
  },
  popularBadge: {
    position: 'absolute',
    top: 0,
    right: 0,
    left: 0,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  popularBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1,
  },
  planHeader: {
    marginTop: 10,
  },
  planNameText: {
    fontSize: 22,
    fontWeight: '800',
  },
  planDescription: {
    fontSize: 13,
    marginTop: 6,
    lineHeight: 18,
  },
  priceSection: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginVertical: 16,
  },
  priceText: {
    fontSize: 32,
    fontWeight: '900',
  },
  cycleLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 4,
  },
  featuresList: {
    marginBottom: 24,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  featureText: {
    fontSize: 13,
    fontWeight: '600',
    flex: 1,
  },
  subscribeButton: {
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  subscribeButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  checkoutContainer: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    maxHeight: '80%',
  },
  checkoutHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    borderBottomWidth: 1,
    paddingBottom: 16,
  },
  merchantInfo: {
    flex: 1,
  },
  merchantName: {
    fontSize: 18,
    fontWeight: '800',
  },
  merchantDesc: {
    fontSize: 12,
    marginTop: 4,
  },
  checkoutBody: {
    marginVertical: 20,
  },
  amountBox: {
    padding: 16,
    borderRadius: 16,
    alignItems: 'center',
    marginBottom: 20,
  },
  amountLabel: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
  },
  amountText: {
    fontSize: 28,
    fontWeight: '900',
    marginTop: 4,
  },
  paymentMethodTitle: {
    fontSize: 14,
    fontWeight: '800',
    marginBottom: 12,
    textTransform: 'uppercase',
  },
  paymentOptionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  paymentOptionLabel: {
    fontSize: 14,
    fontWeight: '700',
  },
  paymentOptionSub: {
    fontSize: 11,
    marginTop: 2,
  },
  checkoutFooter: {
    marginTop: 10,
  },
  cancelBtn: {
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtnText: {
    fontSize: 14,
    fontWeight: '700',
  },
  feedbackOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  feedbackCard: {
    width: '90%',
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
  },
  successIconWrapper: {
    width: 90,
    height: 90,
    borderRadius: 45,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  feedbackTitle: {
    fontSize: 32,
    marginBottom: 8,
  },
  feedbackSubtitle: {
    fontSize: 20,
    textAlign: 'center',
  },
  feedbackDesc: {
    fontSize: 14,
    textAlign: 'center',
    marginTop: 6,
    marginBottom: 24,
  },
  feedbackButton: {
    height: 48,
    alignSelf: 'stretch',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  feedbackButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
  qrContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
  },
  qrCodeMatrix: {
    width: 160,
    height: 160,
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderRadius: 16,
    padding: 10,
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    marginBottom: 12,
  },
  qrCorner: {
    position: 'absolute',
    width: 32,
    height: 32,
    borderWidth: 4,
    borderColor: '#111827',
    borderRadius: 4,
  },
  qrInstructions: {
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 18,
    marginTop: 6,
    paddingHorizontal: 16,
  },
  qrTimer: {
    fontSize: 13,
    fontWeight: '800',
    color: '#EF4444',
    marginTop: 8,
  },
  qrPayBtn: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 10,
    marginTop: 16,
    width: '100%',
    alignItems: 'center',
  },
  qrPayBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
});
