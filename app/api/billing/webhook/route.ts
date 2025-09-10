import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import connectDB from '@/app/lib/db';
import User from '@/app/models/User';
import { LoggingService } from '@/app/lib/services/LoggingService';
import SubscriptionRecord from '@/app/models/SubscriptionRecord';
import PaymentInfo from '@/app/models/PaymentInfo';
import { CONFIG } from '@/app/config/constants';

export const runtime = 'nodejs';

// Initialize Stripe client (lazy initialization)
let stripe: Stripe | null = null;

function getStripe() {
  if (!stripe) {
    const secretKey = process.env.STRIPE_SECRET_KEY;
    if (!secretKey) {
      throw new Error('STRIPE_SECRET_KEY is not configured');
    }
    stripe = new Stripe(secretKey);
  }
  return stripe;
}

// 根据订阅计划更新用户的试用次数
function updateUserUsageForPlan(user: any, plan: 'basic' | 'pro' | 'enterprise') {
  const planConfig = CONFIG.SUBSCRIPTION.PLANS[plan.toUpperCase() as keyof typeof CONFIG.SUBSCRIPTION.PLANS];
  
  if (planConfig) {
    // 根据订阅计划设置试用次数
    if (planConfig.conversions === -1) {
      // 企业套餐：无限制
      user.usage.freeTrialsRemaining = -1; // -1 表示无限制
    } else {
      // 基础套餐和专业套餐：设置对应的转换次数
      user.usage.freeTrialsRemaining = planConfig.conversions;
    }
    
    console.log(`✅ 用户 ${user._id} 订阅 ${plan} 计划，试用次数更新为: ${user.usage.freeTrialsRemaining}`);
  }
}

// 计算所有活跃订阅的累积使用次数
async function calculateCumulativeUsage(user: any) {
  try {
    // 获取用户的所有活跃订阅记录
    const activeSubscriptions = await SubscriptionRecord.find({
      userId: user._id,
      status: 'active'
    });

    console.log(`🔍 用户 ${user._id} 的活跃订阅数量: ${activeSubscriptions.length}`);

    let totalUsage = 0;
    let hasEnterprise = false;

    for (const subscription of activeSubscriptions) {
      console.log(`   - 订阅: ${subscription.plan}, 金额: $${subscription.amount/100}`);
      
      if (subscription.plan === 'enterprise') {
        hasEnterprise = true;
        break; // 企业套餐 = 无限制，直接退出
      } else if (subscription.plan === 'pro') {
        totalUsage += 2000; // Pro套餐: 2000次
      } else if (subscription.plan === 'basic') {
        totalUsage += 500; // Basic套餐: 500次
      }
    }

    if (hasEnterprise) {
      user.usage.freeTrialsRemaining = -1; // 无限制
      console.log(`✅ 用户 ${user._id} 有企业套餐，使用次数设置为无限制`);
    } else {
      user.usage.freeTrialsRemaining = totalUsage;
      console.log(`✅ 用户 ${user._id} 累积使用次数: ${totalUsage} (${activeSubscriptions.length}个活跃订阅)`);
    }

  } catch (error) {
    console.error('计算累积使用次数时出错:', error);
    // 如果出错，使用默认逻辑
    updateUserUsageForPlan(user, user.subscription?.plan || 'basic');
  }
}

export async function POST(req: Request) {
  const sig = req.headers.get('stripe-signature') || '';
  const buf = Buffer.from(await req.arrayBuffer());

  let event: Stripe.Event;
  
  // 在开发环境中跳过签名验证
  if (process.env.NODE_ENV === 'development' && sig === 'test_signature') {
    console.log('⚠️ 开发环境：跳过webhook签名验证');
    try {
      const body = JSON.parse(buf.toString());
      event = body as Stripe.Event;
      console.log(`📨 收到Stripe webhook事件: ${event.type}`);
    } catch (err) {
      console.error('Failed to parse webhook body:', err);
      return new NextResponse('Invalid JSON', { status: 400 });
    }
  } else {
    try {
      event = getStripe().webhooks.constructEvent(buf, sig, process.env.STRIPE_WEBHOOK_SECRET || '');
      console.log(`📨 收到Stripe webhook事件: ${event.type}`);
    } catch (err: unknown) {
      const message = err && typeof err === 'object' && 'message' in err ? String((err as { message: unknown }).message) : 'unknown error';
      console.error('Webhook signature verification failed', message);
      return new NextResponse('Bad signature', { status: 400 });
    }
  }

  try {
    await connectDB();

    console.log(`🔍 处理webhook事件: ${event.type}`);
    console.log(`   事件ID: ${event.id}`);
    console.log(`   事件数据:`, JSON.stringify(event.data, null, 2));

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const appUserId = session.metadata?.appUserId as string | undefined;
        const planRaw = (session.metadata?.plan as string | undefined) || 'basic';
        const safePlan: 'basic' | 'pro' | 'enterprise' =
          planRaw === 'basic' || planRaw === 'pro' || planRaw === 'enterprise' ? planRaw : 'basic';
        
        if (session.subscription && appUserId) {
          const sub = await getStripe().subscriptions.retrieve(session.subscription as string);
          const user = await User.findById(appUserId);
          
          if (user) {
            const oldPlan = user.subscription?.plan || 'free';
            const isActive = sub.status === 'active' || sub.status === 'trialing';
            
            console.log(`🔄 处理订阅完成事件 - 用户: ${appUserId}, 计划: ${safePlan}, 状态: ${sub.status}`);
            console.log(`📅 订阅周期结束时间: ${sub.current_period_end} (${sub.current_period_end ? new Date(sub.current_period_end * 1000).toISOString() : 'undefined'})`);
            
            // 更新用户订阅信息
            user.subscription = {
              ...(user.subscription || {}),
              plan: safePlan,
              isActive,
              stripeCustomerId: (session.customer as string) || user.subscription?.stripeCustomerId,
              stripeSubscriptionId: sub.id,
              currentPeriodEnd: sub.current_period_end ? new Date(sub.current_period_end * 1000) : undefined,
            };
            
            // 更新用户的试用次数
            updateUserUsageForPlan(user, safePlan);
            
            await user.save();
            console.log(`✅ 用户订阅信息已更新并保存`);

            // 记录订阅日志
            await LoggingService.logSubscription({
              userId: appUserId,
              subscriptionId: sub.id,
              action: 'created',
              fromPlan: oldPlan,
              toPlan: safePlan,
              stripeEventId: event.id,
              stripeEventType: event.type,
              amount: sub.items.data[0]?.price.unit_amount || 0,
              currency: sub.currency,
              status: 'success',
              metadata: {
                sessionId: session.id,
                customerId: session.customer,
              },
            });

            // 记录订阅记录
            const currentPeriodStart = sub.current_period_start ? new Date(sub.current_period_start * 1000) : new Date();
            const currentPeriodEnd = sub.current_period_end ? new Date(sub.current_period_end * 1000) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 默认30天后
            
            await LoggingService.logSubscriptionRecord({
              userId: appUserId,
              stripeSubscriptionId: sub.id,
              stripeCustomerId: session.customer as string,
              plan: safePlan,
              status: sub.status as any,
              currentPeriodStart,
              currentPeriodEnd,
              trialStart: sub.trial_start ? new Date(sub.trial_start * 1000) : undefined,
              trialEnd: sub.trial_end ? new Date(sub.trial_end * 1000) : undefined,
              cancelAtPeriodEnd: sub.cancel_at_period_end,
              priceId: sub.items.data[0]?.price.id || '',
              amount: sub.items.data[0]?.price.unit_amount || 0,
              currency: sub.currency,
              interval: sub.items.data[0]?.price.recurring?.interval || 'month',
              intervalCount: sub.items.data[0]?.price.recurring?.interval_count || 1,
              quantity: sub.items.data[0]?.quantity || 1,
              metadata: {
                sessionId: session.id,
              },
              stripeData: sub,
            });
          }
        }
        break;
      }

      case 'customer.subscription.updated': {
        const sub = event.data.object as Stripe.Subscription;
        const customerId = sub.customer as string;
        const user = await User.findOne({ 'subscription.stripeCustomerId': customerId });
        
        if (user) {
          const oldStatus = user.subscription?.isActive;
          const oldPlan = user.subscription?.plan;
          const isActive = sub.status === 'active' || sub.status === 'trialing';
          
          // 从Stripe订阅数据中提取计划信息
          const priceId = sub.items.data[0]?.price.id || '';
          const amount = sub.items.data[0]?.price.unit_amount || 0;
          let newPlan: 'basic' | 'pro' | 'enterprise' = 'basic';
          
          console.log(`🔍 订阅更新调试信息:`);
          console.log(`   价格ID: ${priceId}`);
          console.log(`   金额: ${amount} ($${amount/100})`);
          console.log(`   旧计划: ${oldPlan}`);
          
          // 根据价格ID和金额确定计划类型
          if (priceId.includes('enterprise') || priceId.includes('price_enterprise') || priceId === 'price_enterprise_test' || amount === 4999) {
            newPlan = 'enterprise';
          } else if (priceId.includes('pro') || priceId.includes('price_pro') || priceId === 'price_pro_test' || amount === 1999) {
            newPlan = 'pro';
          } else if (priceId.includes('basic') || priceId.includes('price_basic') || priceId === 'price_basic_test' || amount === 999) {
            newPlan = 'basic';
          }
          
          console.log(`   根据价格ID和金额推断计划: ${newPlan} (价格ID: ${priceId}, 金额: $${amount/100})`);
          
          // 特殊处理：根据CSV中的真实价格ID进行匹配
          if (priceId === 'price_1S5KtNETPwR1qydLM0k0et1R') {
            newPlan = 'enterprise'; // Enterprise计划
            console.log(`   🔧 特殊匹配: ${priceId} -> enterprise`);
          } else if (priceId === 'price_1S5Ks8ETPwR1qydL0zcZ1Wle') {
            newPlan = 'pro'; // Pro计划
            console.log(`   🔧 特殊匹配: ${priceId} -> pro`);
          } else if (priceId === 'price_1S5KqnETPwR1qydL3HqQgTeR') {
            newPlan = 'basic'; // Basic计划
            console.log(`   🔧 特殊匹配: ${priceId} -> basic`);
          }
          
          console.log(`   新计划: ${newPlan}`);
          console.log(`🔄 订阅更新 - 用户: ${user._id}, 旧计划: ${oldPlan}, 新计划: ${newPlan}, 状态: ${sub.status}`);
          
          // 更新用户订阅信息
          user.subscription = {
            ...(user.subscription || {}),
            plan: newPlan,
            isActive,
            stripeCustomerId: customerId,
            stripeSubscriptionId: sub.id,
            currentPeriodEnd: sub.current_period_end ? new Date(sub.current_period_end * 1000) : undefined,
          };
          
          // 如果订阅变为活跃状态，计算累积使用次数
          if (isActive) {
            await calculateCumulativeUsage(user);
            console.log(`✅ 用户 ${user._id} 订阅更新，累积使用次数更新为: ${user.usage.freeTrialsRemaining}`);
          }
          
          await user.save();

          // 记录订阅日志
          await LoggingService.logSubscription({
            userId: user._id.toString(),
            subscriptionId: sub.id,
            action: 'updated',
            fromPlan: oldPlan,
            toPlan: newPlan,
            stripeEventId: event.id,
            stripeEventType: event.type,
            amount: sub.items.data[0]?.price.unit_amount || 0,
            currency: sub.currency,
            status: 'success',
            metadata: {
              oldStatus,
              newStatus: isActive,
              oldPlan,
              newPlan,
              customerId,
            },
          });

          // 检查是否是计划变更，如果是则创建新的订阅记录
          if (oldPlan !== newPlan) {
            console.log(`🔄 检测到计划变更: ${oldPlan} -> ${newPlan}，创建新的订阅记录`);
            
            // 创建新的订阅记录（计划变更）
            await LoggingService.logSubscriptionRecord({
              userId: user._id.toString(),
              stripeSubscriptionId: sub.id,
              stripeCustomerId: customerId,
              plan: newPlan,
              status: sub.status as any,
              currentPeriodStart: sub.current_period_start ? new Date(sub.current_period_start * 1000) : undefined,
              currentPeriodEnd: sub.current_period_end ? new Date(sub.current_period_end * 1000) : undefined,
              trialStart: sub.trial_start ? new Date(sub.trial_start * 1000) : undefined,
              trialEnd: sub.trial_end ? new Date(sub.trial_end * 1000) : undefined,
              cancelAtPeriodEnd: sub.cancel_at_period_end,
              priceId: sub.items.data[0]?.price.id || '',
              amount: sub.items.data[0]?.price.unit_amount || 0,
              currency: sub.currency,
              interval: sub.items.data[0]?.price.recurring?.interval || 'month',
              intervalCount: sub.items.data[0]?.price.recurring?.interval_count || 1,
              quantity: sub.items.data[0]?.quantity || 1,
              metadata: {
                customerId,
                planChange: true,
                oldPlan,
                newPlan,
                changeType: 'plan_upgrade',
              },
              stripeData: sub,
            });
          } else {
            // 更新现有订阅记录（非计划变更）
            await LoggingService.logSubscriptionRecord({
              userId: user._id.toString(),
              stripeSubscriptionId: sub.id,
              stripeCustomerId: customerId,
              plan: newPlan,
              status: sub.status as any,
              currentPeriodStart: sub.current_period_start ? new Date(sub.current_period_start * 1000) : undefined,
              currentPeriodEnd: sub.current_period_end ? new Date(sub.current_period_end * 1000) : undefined,
              trialStart: sub.trial_start ? new Date(sub.trial_start * 1000) : undefined,
              trialEnd: sub.trial_end ? new Date(sub.trial_end * 1000) : undefined,
              cancelAtPeriodEnd: sub.cancel_at_period_end,
              priceId: sub.items.data[0]?.price.id || '',
              amount: sub.items.data[0]?.price.unit_amount || 0,
              currency: sub.currency,
              interval: sub.items.data[0]?.price.recurring?.interval || 'month',
              intervalCount: sub.items.data[0]?.price.recurring?.interval_count || 1,
              quantity: sub.items.data[0]?.quantity || 1,
              metadata: {
                customerId,
                planChange: false,
                oldPlan,
                newPlan,
                changeType: 'status_update',
              },
              stripeData: sub,
            });
          }
        }
        break;
      }

      case 'customer.subscription.deleted': {
        const sub = event.data.object as Stripe.Subscription;
        const customerId = sub.customer as string;
        const user = await User.findOne({ 'subscription.stripeCustomerId': customerId });
        
        if (user) {
          // 更新用户订阅信息
          user.subscription = {
            ...(user.subscription || {}),
            isActive: false,
            stripeSubscriptionId: sub.id,
          };
          
          // 订阅取消后，恢复免费用户的试用次数
          user.usage.freeTrialsRemaining = CONFIG.FREE_TRIAL.AUTHENTICATED_USER_LIMIT;
          console.log(`⚠️ 用户 ${user._id} 订阅已取消，试用次数恢复为: ${user.usage.freeTrialsRemaining}`);
          
          await user.save();

          // 记录订阅日志
          await LoggingService.logSubscription({
            userId: user._id.toString(),
            subscriptionId: sub.id,
            action: 'cancelled',
            stripeEventId: event.id,
            stripeEventType: event.type,
            status: 'success',
            metadata: {
              customerId,
              canceledAt: sub.canceled_at ? new Date(sub.canceled_at * 1000) : new Date(),
            },
          });
        }
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        const customerId = invoice.customer as string;
        const user = await User.findOne({ 'subscription.stripeCustomerId': customerId });
        
        if (user) {
          // 更新用户订阅信息
          user.subscription = {
            ...(user.subscription || {}),
            isActive: false,
          };
          
          // 支付失败后，恢复免费用户的试用次数
          user.usage.freeTrialsRemaining = CONFIG.FREE_TRIAL.AUTHENTICATED_USER_LIMIT;
          console.log(`❌ 用户 ${user._id} 支付失败，试用次数恢复为: ${user.usage.freeTrialsRemaining}`);
          
          await user.save();

          // 记录订阅日志
          await LoggingService.logSubscription({
            userId: user._id.toString(),
            subscriptionId: user.subscription?.stripeSubscriptionId,
            action: 'payment_failed',
            stripeEventId: event.id,
            stripeEventType: event.type,
            amount: invoice.amount_due,
            currency: invoice.currency,
            status: 'failed',
            errorMessage: `Payment failed for invoice ${invoice.id}`,
            metadata: {
              invoiceId: invoice.id,
              customerId,
              attemptCount: invoice.attempt_count,
            },
          });
        }
        break;
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as Stripe.Invoice;
        const customerId = invoice.customer as string;
        const user = await User.findOne({ 'subscription.stripeCustomerId': customerId });
        
        if (user && invoice.subscription) {
          // 记录支付成功日志
          await LoggingService.logSubscription({
            userId: user._id.toString(),
            subscriptionId: invoice.subscription as string,
            action: 'payment_succeeded',
            stripeEventId: event.id,
            stripeEventType: event.type,
            amount: invoice.amount_paid,
            currency: invoice.currency,
            status: 'success',
            metadata: {
              invoiceId: invoice.id,
              customerId,
              paymentIntentId: invoice.payment_intent,
            },
          });

          // 记录支付信息
          if (invoice.payment_intent) {
            const paymentIntent = await getStripe().paymentIntents.retrieve(invoice.payment_intent as string);
            await LoggingService.logPayment({
              userId: user._id.toString(),
              subscriptionId: invoice.subscription as string,
              paymentIntentId: invoice.payment_intent as string,
              invoiceId: invoice.id,
              chargeId: paymentIntent.latest_charge as string,
              amount: invoice.amount_paid,
              currency: invoice.currency,
              status: 'succeeded',
              paymentMethod: {
                type: paymentIntent.payment_method?.type as any || 'card',
                last4: (paymentIntent.payment_method as any)?.card?.last4,
                brand: (paymentIntent.payment_method as any)?.card?.brand,
                expMonth: (paymentIntent.payment_method as any)?.card?.exp_month,
                expYear: (paymentIntent.payment_method as any)?.card?.exp_year,
                country: (paymentIntent.payment_method as any)?.card?.country,
              },
              billingDetails: {
                name: (paymentIntent.payment_method as any)?.billing_details?.name,
                email: (paymentIntent.payment_method as any)?.billing_details?.email,
                phone: (paymentIntent.payment_method as any)?.billing_details?.phone,
                address: (paymentIntent.payment_method as any)?.billing_details?.address,
              },
              description: `Payment for subscription ${invoice.subscription}`,
              receiptUrl: invoice.hosted_invoice_url,
              paidAt: new Date(),
              metadata: {
                invoiceId: invoice.id,
                customerId,
              },
              stripeData: paymentIntent,
            });
          }
        }
        break;
      }

      default:
        break;
    }

    return NextResponse.json({ received: true });
  } catch (e: unknown) {
    console.error('❌ Webhook处理错误:', e);
    
    // 提供更详细的错误信息
    if (e && typeof e === 'object' && 'message' in e) {
      console.error('错误详情:', (e as any).message);
      if ('errors' in e) {
        console.error('验证错误:', (e as any).errors);
      }
    }
    
    return new NextResponse('Server error', { status: 500 });
  }
}


