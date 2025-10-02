#!/usr/bin/env python3
"""
User Data Extraction Script
Retrieves all user accounts from the database for marketing, growth, and analytics.
"""

import sys
import os
sys.path.append('backend')

from backend.app import create_app, db
from backend.app.models import User, Payment, RenderJob
from datetime import datetime
import json

def get_all_users():
    """Get all users with their associated data"""
    app = create_app('development')
    
    with app.app_context():
        users = User.query.all()
        user_data = []
        
        for user in users:
            # Get user payments
            payments = Payment.query.filter_by(user_id=user.id).all()
            
            # Get user render jobs
            render_jobs = RenderJob.query.filter_by(user_id=user.id).all()
            
            user_info = {
                'id': user.id,
                'email': user.email,
                'created_at': user.created_at.isoformat() if user.created_at else None,
                'is_active': user.is_active,
                'account_type': user.account_type,
                'plan': user.plan,
                'playlists': user.playlists,
                'marketing_consent': user.marketing_consent,
                'total_payments': len(payments),
                'total_render_jobs': len(render_jobs),
                'payment_history': [
                    {
                        'id': p.id,
                        'amount': p.amount,
                        'status': p.status,
                        'created_at': p.created_at.isoformat() if p.created_at else None
                    } for p in payments
                ],
                'render_history': [
                    {
                        'id': r.id,
                        'status': r.status,
                        'created_at': r.created_at.isoformat() if r.created_at else None,
                        'completed_at': r.completed_at.isoformat() if r.completed_at else None
                    } for r in render_jobs
                ]
            }
            user_data.append(user_info)
        
        return user_data

def reset_user_password(email, new_password):
    """Reset password for a specific user"""
    from werkzeug.security import generate_password_hash
    
    app = create_app('development')
    
    with app.app_context():
        user = User.query.filter_by(email=email).first()
        if user:
            user.password_hash = generate_password_hash(new_password)
            db.session.commit()
            print(f"✅ Password reset for {email}")
            return True
        else:
            print(f"❌ User {email} not found")
            return False

def get_user_stats():
    """Get user statistics for analytics"""
    app = create_app('development')
    
    with app.app_context():
        total_users = User.query.count()
        active_users = User.query.filter_by(is_active=True).count()
        
        # Users by plan
        free_users = User.query.filter_by(plan='free').count()
        starter_users = User.query.filter_by(plan='starter').count()
        pro_users = User.query.filter_by(plan='pro').count()
        
        # Users by account type
        regular_users = User.query.filter_by(account_type='user').count()
        training_users = User.query.filter_by(account_type='training').count()
        admin_users = User.query.filter_by(account_type='admin').count()
        
        # Marketing consent
        marketing_consent_users = User.query.filter_by(marketing_consent=True).count()
        
        stats = {
            'total_users': total_users,
            'active_users': active_users,
            'inactive_users': total_users - active_users,
            'plans': {
                'free': free_users,
                'starter': starter_users,
                'pro': pro_users
            },
            'account_types': {
                'user': regular_users,
                'training': training_users,
                'admin': admin_users
            },
            'marketing_consent': marketing_consent_users,
            'marketing_consent_rate': f"{(marketing_consent_users/total_users*100):.1f}%" if total_users > 0 else "0%"
        }
        
        return stats

if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(description='User Data Management')
    parser.add_argument('--action', choices=['list', 'stats', 'reset-password'], 
                       default='stats', help='Action to perform')
    parser.add_argument('--email', help='Email for password reset')
    parser.add_argument('--password', help='New password for reset')
    parser.add_argument('--export', help='Export users to JSON file')
    
    args = parser.parse_args()
    
    if args.action == 'list':
        users = get_all_users()
        print(f"\n📊 Found {len(users)} users:")
        print("=" * 60)
        
        for user in users:
            print(f"ID: {user['id']}")
            print(f"Email: {user['email']}")
            print(f"Created: {user['created_at']}")
            print(f"Plan: {user['plan']}")
            print(f"Active: {user['is_active']}")
            print(f"Payments: {user['total_payments']}")
            print(f"Render Jobs: {user['total_render_jobs']}")
            print("-" * 40)
        
        if args.export:
            with open(args.export, 'w') as f:
                json.dump(users, f, indent=2)
            print(f"\n💾 Data exported to {args.export}")
    
    elif args.action == 'stats':
        stats = get_user_stats()
        print("\n📈 User Statistics:")
        print("=" * 40)
        print(f"Total Users: {stats['total_users']}")
        print(f"Active Users: {stats['active_users']}")
        print(f"Inactive Users: {stats['inactive_users']}")
        print(f"\nPlan Distribution:")
        print(f"  Free: {stats['plans']['free']}")
        print(f"  Starter: {stats['plans']['starter']}")
        print(f"  Pro: {stats['plans']['pro']}")
        print(f"\nAccount Types:")
        print(f"  Regular: {stats['account_types']['user']}")
        print(f"  Training: {stats['account_types']['training']}")
        print(f"  Admin: {stats['account_types']['admin']}")
        print(f"\nMarketing Consent: {stats['marketing_consent']} ({stats['marketing_consent_rate']})")
    
    elif args.action == 'reset-password':
        if not args.email or not args.password:
            print("❌ Email and password required for reset")
            sys.exit(1)
        
        success = reset_user_password(args.email, args.password)
        if success:
            print(f"✅ Password reset successful for {args.email}")
            print(f"New password: {args.password}")
        else:
            print(f"❌ Password reset failed for {args.email}")