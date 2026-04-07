# Troubleshooting Guide

Solutions to common issues you might encounter while using Chamber.

## Table of Contents

- [Login & Authentication](#login--authentication)
- [Expenses](#expenses)
- [Receipts](#receipts)
- [Accounts](#accounts)
- [Loans](#loans)
- [Subscriptions](#subscriptions)
- [Telegram Bot](#telegram-bot)
- [Dashboard & Analytics](#dashboard--analytics)
- [Export & Data](#export--data)
- [Performance](#performance)
- [Still Need Help?](#still-need-help)

## Login & Authentication

### Can't Sign In

**Problem:** Unable to log in to Chamber.

**Solutions:**
1. Check your email/password are correct
2. Try signing in with Google/GitHub if you used that method
3. Clear browser cache and cookies
4. Try a different browser
5. Check if the site is loading (might be a server issue)

### Sign Up Not Working

**Problem:** Can't create an account.

**Solutions:**
1. Ensure email format is correct
2. Password must meet minimum requirements
3. Check if email is already registered
4. Try social login (Google/GitHub) instead

### "Unauthorized" Error

**Problem:** Seeing "Unauthorized" when performing actions.

**Solutions:**
1. Your session may have expired - sign out and back in
2. Check if you're logged in to the correct account
3. Refresh the page

### Clerk Authentication Errors

**Problem:** Authentication-related errors mentioning "Clerk".

**Solutions:**
1. Sign out completely
2. Clear browser cookies for the site
3. Sign back in
4. If self-hosting, check Clerk API keys are correct

## Expenses

### Expense Not Saving

**Problem:** Clicking "Save" doesn't create the expense.

**Solutions:**
1. Check required fields are filled (Amount, Category, Description)
2. Ensure amount is a valid number (no letters)
3. Try refreshing the page
4. Check internet connection

### Expense Not Appearing in List

**Problem:** Added expense doesn't show up.

**Solutions:**
1. Check filters - clear all filters to see all expenses
2. Check date range - expense might be outside current view
3. Refresh the page
4. Wait a few seconds - there might be a slight delay

### Can't Delete Expense

**Problem:** Delete button doesn't work.

**Solutions:**
1. Confirm the deletion in the dialog
2. Check if you're the owner of the expense
3. Refresh and try again
4. Check internet connection

### Edit Changes Not Saving

**Problem:** Editing an expense doesn't update it.

**Solutions:**
1. Ensure you click "Save" after editing
2. Check all required fields are still valid
3. Refresh the page and try again

## Receipts

### Receipt Upload Failing

**Problem:** Can't upload receipt images or PDFs.

**Solutions:**
1. Check file format (JPG, PNG, PDF supported)
2. Ensure file is under size limit (check with your admin)
3. Try a different file
4. Check internet connection
5. If using mobile, ensure camera permissions are granted

### Receipt Not Displaying

**Problem:** Uploaded receipt shows broken image.

**Solutions:**
1. Refresh the page
2. Check if receipt was fully uploaded
3. Try viewing in a different browser
4. Check if receipt file is corrupted

### Can't Delete Receipt

**Problem:** Delete receipt button not working.

**Solutions:**
1. Refresh the page and try again
2. Ensure you own the expense
3. Check if receipt is still processing

### "Error Uploading Receipt"

**Problem:** Generic upload error message.

**Solutions:**
1. Check file size - large files may fail
2. Try compressing the image first
3. Check internet connection
4. Try again later (might be temporary server issue)

## Accounts

### Account Balance Not Updating

**Problem:** New balance doesn't save.

**Solutions:**
1. Ensure balance is a valid number
2. Check date format
3. Try refreshing and updating again
4. Ensure you're editing your own account

### Net Worth Shows Wrong Amount

**Problem:** Net worth calculation seems incorrect.

**Solutions:**
1. Check all account balances are current
2. Remember: Investments are included in net worth
3. Outstanding loans are NOT included
4. Refresh to recalculate

### Can't Delete Account

**Problem:** Account deletion fails.

**Solutions:**
1. Check if account has balance history (delete history first if needed)
2. Ensure you're the owner
3. Refresh and try again

### Account Not Appearing in Payment Methods

**Problem:** Account doesn't show when adding expenses.

**Solutions:**
1. Ensure account is saved successfully
2. Check if account is active
3. Refresh the expense form
4. Try logging out and back in

## Loans

### Loan Status Not Updating

**Problem:** Status stays PENDING after repayment.

**Solutions:**
1. Check if repayment was saved successfully
2. Verify repayment amount was recorded
3. Status updates: PENDING → PARTIAL → COMPLETED
4. Refresh to see updated status

### Can't Add Repayment

**Problem:** Repayment form not working.

**Solutions:**
1. Check amount is valid
2. Ensure date is in correct format
3. Try refreshing the page
4. Check if loan still exists

### Repayment Amount Wrong

**Problem:** Repayment shows incorrect amount.

**Solutions:**
1. Edit the repayment to correct it
2. Delete and re-add if needed
3. Check if multiple repayments were added accidentally

## Subscriptions

### Subscription Not Creating Expense

**Problem:** Billing date passed but no expense created.

**Solutions:**
1. Check if subscription is still active
2. Verify billing date is correct
3. Check if billing cycle is set correctly
4. Cron job might be delayed - wait up to 24 hours

### Not Receiving Telegram Alerts

**Problem:** No subscription reminders.

**Solutions:**
1. Ensure Telegram is linked (check Telegram page)
2. Check "Alert Days" is set on subscription
3. Verify subscription is active
4. Check Telegram notification settings
5. Ensure subscription due date is in the future

### Subscription Showing Wrong Next Date

**Problem:** Next billing date incorrect after payment.

**Solutions:**
1. Edit the subscription
2. Manually correct the next billing date
3. Future dates will calculate from this corrected date

### Can't Delete Subscription

**Problem:** Delete button not working.

**Solutions:**
1. Refresh and try again
2. Check if you own the subscription
3. Past expenses from subscription won't be deleted (expected behavior)

## Telegram Bot

### Bot Not Responding

**Problem:** Sending messages but getting no reply.

**Solutions:**
1. Check if account is still linked (in Chamber web app)
2. Try sending `/start` again
3. Check if bot is online (might be maintenance)
4. Unlink and re-link your account

### "Account Already Linked" Error

**Problem:** Can't link Telegram account.

**Solutions:**
1. Your Telegram might be linked to a different Chamber account
2. Unlink from the other account first
3. Or use `/unlink` in Telegram
4. Try linking again

### Expenses Not Appearing

**Problem:** Sent message/photo but expense not in Chamber.

**Solutions:**
1. Wait 10-30 seconds - AI processing takes time
2. Check if you received a confirmation message
3. If confirmation shows error, try again
4. Check internet connection
5. Refresh Chamber web app

### AI Parsing Wrong Amount

**Problem:** Bot extracted wrong amount from message.

**Solutions:**
1. Edit the expense in web app to correct it
2. Be more specific in future messages
3. Include currency symbol (e.g., "$50" not "50")
4. Mention amount clearly: "spent $50" not "about 50 bucks"

### Receipt Photo Not Parsing

**Problem:** Sent photo but no expense created.

**Solutions:**
1. Ensure photo is clear and well-lit
2. Check receipt is readable
3. Try cropping to just the receipt
4. OCR might fail on handwritten receipts
5. Try text message instead

### Code Expired

**Problem:** Linking code doesn't work.

**Solutions:**
1. Codes expire after 30 minutes
2. Go to Chamber → Telegram
3. Click "Generate New Code"
4. Use new code within 30 minutes

### Can't Unlink Telegram

**Problem:** Unlink button not working.

**Solutions:**
1. Try `/unlink` command in Telegram instead
2. Refresh the page and try again
3. Clear browser cache

## Dashboard & Analytics

### Dashboard Not Loading

**Problem:** Dashboard shows blank or error.

**Solutions:**
1. Refresh the page
2. Check internet connection
3. Wait a moment - data might be loading
4. Try accessing a different page first

### Charts Not Displaying

**Problem:** Graphs or charts are blank.

**Solutions:**
1. Ensure you have expenses in the date range
2. Check if browser supports SVG (modern browsers do)
3. Try zooming out (Ctrl/Cmd + -)
4. Disable browser extensions that block scripts

### Wrong Monthly Total

**Problem:** Monthly spending shows incorrect amount.

**Solutions:**
1. Check date filters
2. Investments are NOT counted in remaining budget (expected)
3. Check if expenses have wrong dates
4. Refresh to recalculate

### Calendar Not Showing Expenses

**Problem:** Expense calendar is empty.

**Solutions:**
1. Check if you're filtering by category
2. Expenses only show on their date
3. Check if date range includes your expenses
4. Refresh the page

## Export & Data

### Export Failing

**Problem:** Export button doesn't work or produces empty file.

**Solutions:**
1. Ensure you have data to export
2. Check browser download settings
3. Try a different browser
4. Check if pop-up blocker is preventing download

### CSV Format Wrong

**Problem:** Exported CSV looks strange in Excel.

**Solutions:**
1. Open in a text editor first to check
2. In Excel, use Data → From Text/CSV import
3. Set encoding to UTF-8
4. Set delimiter to comma

### Missing Data in Export

**Problem:** Export doesn't include all expected data.

**Solutions:**
1. Check if filters were applied before export
2. Clear all filters and export again
3. Check date ranges
4. Some fields might be optional and empty

### Can't Import Data

**Problem:** No import option found.

**Note:** Chamber currently doesn't support importing expenses from CSV. You'll need to add them manually.

## Performance

### Page Loading Slowly

**Problem:** Pages take long to load.

**Solutions:**
1. Check internet connection
2. Close other browser tabs
3. Clear browser cache
4. Try a different browser
5. If self-hosting, check server resources

### App Freezing

**Problem:** Chamber becomes unresponsive.

**Solutions:**
1. Refresh the page
2. Clear browser cache
3. Close and reopen browser
4. Check computer memory usage
5. Disable browser extensions temporarily

### Search Slow

**Problem:** Searching expenses takes time.

**Solutions:**
1. If you have many expenses, be patient
2. Try more specific search terms
3. Use filters to narrow results first
4. Clear filters if search seems stuck

## Error Messages

### "Unauthorized"

**Meaning:** Your session expired or you're not logged in.

**Fix:** Sign out and sign back in.

### "Failed to Fetch"

**Meaning:** Network error or server issue.

**Fix:** Check internet connection and refresh.

### "Something Went Wrong"

**Meaning:** Generic error - various causes.

**Fix:** Refresh and try again. If persists, contact support.

### "Network Error"

**Meaning:** Can't connect to Chamber servers.

**Fix:** Check internet connection, try again later.

## Browser-Specific Issues

### Safari

**Issue:** Images not loading.
**Fix:** Check Safari preferences → Privacy → Prevent cross-site tracking (might block receipts).

### Chrome

**Issue:** Slow performance.
**Fix:** Clear cache: Chrome menu → More Tools → Clear browsing data.

### Firefox

**Issue:** Forms not submitting.
**Fix:** Disable tracking protection for the site temporarily.

### Mobile Browsers

**Issue:** Layout looks wrong.
**Fix:** Use landscape mode or ensure browser is updated.

## Still Need Help?

If you can't find a solution:

1. **Check the FAQ** - [FAQ.md](./faq.md)
2. **Review Documentation** - Feature-specific guides
3. **Search GitHub Issues** - [Sukhendu2002/Chamber/issues](https://github.com/Sukhendu2002/Chamber/issues)
4. **Open a New Issue** - Report the bug with:
   - What you were trying to do
   - What happened instead
   - Error messages (if any)
   - Browser and device info
   - Screenshots (if applicable)

### Reporting Issues

When reporting issues, include:
- Steps to reproduce
- Expected behavior
- Actual behavior
- Browser version
- Device/OS
- Screenshots (helpful!)

---

**Last Updated:** April 2026
