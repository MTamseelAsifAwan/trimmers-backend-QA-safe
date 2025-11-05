// scripts/analyze-shop-query.js
/**
 * Interactive script to analyze shop query execution plans
 * Helps identify if indexes are being used correctly
 * 
 * Usage: node scripts/analyze-shop-query.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const Shop = require('../src/models/Shop');

const queries = {
    1: {
        name: 'Basic Filter (isVerified + isActive)',
        query: { isVerified: true, isActive: true },
        expectedIndex: 'idx_verified_active'
    },
    2: {
        name: 'Owner Filter',
        query: { ownerId: '507f1f77bcf86cd799439011', isActive: true },
        expectedIndex: 'idx_owner_active'
    },
    3: {
        name: 'Country Filter',
        query: { countryId: '507f1f77bcf86cd799439011', isVerified: true, isActive: true },
        expectedIndex: 'idx_country_verified_active'
    },
    4: {
        name: 'Text Search',
        query: { 
            isVerified: true, 
            isActive: true,
            $or: [
                { name: { $regex: 'barber', $options: 'i' } },
                { address: { $regex: 'barber', $options: 'i' } }
            ]
        },
        expectedIndex: 'idx_verified_active or idx_search_fields'
    },
    5: {
        name: 'Rating Sort',
        query: { isActive: true, isVerified: true },
        sort: { rating: -1, reviewCount: -1 },
        expectedIndex: 'idx_rating_reviews'
    }
};

async function analyzeQuery(queryNum) {
    const querySpec = queries[queryNum];
    
    console.log('\n' + '='.repeat(80));
    console.log(`📊 Analyzing: ${querySpec.name}`);
    console.log('='.repeat(80));
    console.log('Query:', JSON.stringify(querySpec.query, null, 2));
    if (querySpec.sort) {
        console.log('Sort:', JSON.stringify(querySpec.sort, null, 2));
    }
    console.log('Expected Index:', querySpec.expectedIndex);
    console.log('-'.repeat(80));

    try {
        const start = Date.now();
        let explain;

        if (querySpec.sort) {
            explain = await Shop.find(querySpec.query)
                .sort(querySpec.sort)
                .limit(20)
                .explain('executionStats');
        } else {
            explain = await Shop.find(querySpec.query)
                .limit(20)
                .explain('executionStats');
        }

        const executionTime = Date.now() - start;
        const stats = explain.executionStats;
        const stage = stats.executionStages;

        console.log('\n📈 EXECUTION STATISTICS:');
        console.log(`⏱️  Execution Time: ${executionTime}ms`);
        console.log(`📊 Total Docs Examined: ${stats.totalDocsExamined}`);
        console.log(`📦 Documents Returned: ${stats.nReturned}`);
        console.log(`🔍 Execution Stage: ${stage.stage}`);

        if (stage.stage === 'FETCH' && stage.inputStage) {
            console.log(`🔑 Index Used: ${stage.inputStage.indexName || 'NONE'}`);
            console.log(`📊 Keys Examined: ${stage.inputStage.keysExamined || 0}`);
        } else if (stage.stage === 'IXSCAN') {
            console.log(`🔑 Index Used: ${stage.indexName || 'NONE'}`);
            console.log(`📊 Keys Examined: ${stage.keysExamined || 0}`);
        } else if (stage.stage === 'COLLSCAN') {
            console.log('❌ WARNING: Full collection scan! No index used.');
        } else {
            console.log(`🔑 Index: ${stage.indexName || 'COMPLEX/UNKNOWN'}`);
        }

        // Performance rating
        console.log('\n🎯 PERFORMANCE RATING:');
        if (stage.stage === 'COLLSCAN') {
            console.log('❌ POOR - Full collection scan detected');
            console.log('💡 Recommendation: Add appropriate index');
        } else if (stats.totalDocsExamined > stats.nReturned * 2) {
            console.log('⚠️  FAIR - Examining too many documents');
            console.log('💡 Recommendation: Optimize index or query pattern');
        } else if (executionTime < 50) {
            console.log('✅ EXCELLENT - Very fast query (<50ms)');
        } else if (executionTime < 200) {
            console.log('✅ GOOD - Acceptable performance (<200ms)');
        } else {
            console.log('⚠️  NEEDS IMPROVEMENT - Slow query (>200ms)');
        }

        // Index efficiency
        if (stage.stage !== 'COLLSCAN') {
            const efficiency = stats.nReturned / Math.max(stats.totalDocsExamined, 1) * 100;
            console.log(`\n📊 Index Efficiency: ${efficiency.toFixed(2)}%`);
            if (efficiency > 80) {
                console.log('✅ Excellent index selectivity');
            } else if (efficiency > 50) {
                console.log('✅ Good index selectivity');
            } else if (efficiency > 20) {
                console.log('⚠️  Moderate index selectivity');
            } else {
                console.log('❌ Poor index selectivity - consider query optimization');
            }
        }

    } catch (error) {
        console.error('❌ Error analyzing query:', error.message);
    }
}

async function main() {
    try {
        // Connect to MongoDB
        await mongoose.connect(process.env.MONGODB_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true
        });

        console.log('✓ Connected to MongoDB');
        console.log('\n🔍 Shop Query Analyzer');
        console.log('='.repeat(80));

        // Count total shops
        const totalShops = await Shop.countDocuments();
        console.log(`📊 Total shops in database: ${totalShops}`);

        // Analyze each query pattern
        for (let i = 1; i <= Object.keys(queries).length; i++) {
            await analyzeQuery(i);
        }

        // Summary
        console.log('\n' + '='.repeat(80));
        console.log('📝 ANALYSIS COMPLETE');
        console.log('='.repeat(80));
        console.log('\n💡 GENERAL RECOMMENDATIONS:');
        console.log('   1. Ensure all indexes are created: node scripts/add-shop-indexes.js');
        console.log('   2. Queries should use IXSCAN, not COLLSCAN');
        console.log('   3. Index efficiency should be > 50%');
        console.log('   4. Query execution time should be < 200ms');
        console.log('   5. Monitor query patterns and adjust indexes accordingly');
        console.log('\n📚 For detailed optimization guide, see:');
        console.log('   docs/shop-endpoint-optimization.md');

        await mongoose.connection.close();
        console.log('\n✓ Database connection closed');
        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error);
        await mongoose.connection.close();
        process.exit(1);
    }
}

// Run analysis
main();
