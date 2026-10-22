package com.cubecoach.app;

import android.app.Activity;
import android.util.Log;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.google.android.play.agesignals.AgeSignalsAccessRequest;
import com.google.android.play.agesignals.AgeSignalsException;
import com.google.android.play.agesignals.AgeSignalsManager;
import com.google.android.play.agesignals.AgeSignalsManagerFactory;
import com.google.android.play.agesignals.AgeSignalsRequest;
import com.google.android.play.agesignals.AgeSignalsResult;
import com.google.android.play.agesignals.model.AgeSignalsErrorCode;
import com.google.android.play.agesignals.model.AgeSignalsStatus;

/**
 * Google Play Age Signals (US state laws such as Texas SB 2420, Brazil's Digital ECA).
 *
 * check() always resolves with { state, errorCode }:
 *   state "child" (under 13), "teen" (13 to 17), "adult", "verify" (age unknown where the law requires verification),
 *   "declined" (user or parent chose not to share) or "unknown" (no signal, not supported here, or an error).
 * The app uses the result only to show no ads to users under 18. It never leaves the device: it is not sent to a
 * server, to analytics or to an ad network (Play Age Signals terms).
 */
@CapacitorPlugin(name = "AgeSignals")
public class AgeSignalsPlugin extends Plugin {

    private static final String TAG = "AgeSignals";

    /** Created on first use, only on the main thread. */
    private AgeSignalsManager manager;

    @PluginMethod
    public void check(final PluginCall call) {
        // requestAgeSignalsAccess may open Play's age-sharing prompt, so start it from the main thread.
        getBridge().executeOnMainThread(() -> requestAccess(call));
    }

    private void requestAccess(final PluginCall call) {
        Activity activity = getActivity();
        if (activity == null || activity.isFinishing()) {
            call.resolve(result("unknown", AgeSignalsErrorCode.NO_ERROR));
            return;
        }
        try {
            if (manager == null) manager = AgeSignalsManagerFactory.create(activity.getApplicationContext());
            AgeSignalsAccessRequest request = AgeSignalsAccessRequest.builder().setActivity(activity).build();
            manager.requestAgeSignalsAccess(request)
                    .addOnSuccessListener(access -> {
                        Integer status = access.ageSignalsStatus();
                        if (status == null) {
                            call.resolve(result("unknown", AgeSignalsErrorCode.NO_ERROR));
                        } else if (status == AgeSignalsStatus.SHARED) {
                            readSignals(call);
                        } else if (status == AgeSignalsStatus.VERIFICATION_REQUIRED) {
                            call.resolve(result("verify", AgeSignalsErrorCode.NO_ERROR));
                        } else if (status == AgeSignalsStatus.NOT_SHARED) {
                            call.resolve(result("declined", AgeSignalsErrorCode.NO_ERROR));
                        } else {
                            call.resolve(result("unknown", AgeSignalsErrorCode.NO_ERROR));
                        }
                    })
                    .addOnFailureListener(e -> call.resolve(failure(e)));
        } catch (RuntimeException e) {
            call.resolve(failure(e));
        }
    }

    private void readSignals(final PluginCall call) {
        manager.checkAgeSignals(AgeSignalsRequest.builder().build())
                .addOnSuccessListener(signals -> call.resolve(result(stateOf(signals), AgeSignalsErrorCode.NO_ERROR)))
                .addOnFailureListener(e -> call.resolve(failure(e)));
    }

    /** Default Play bands are 0-12, 13-15, 16-17 and 18+. Keep them in Play Console so 18 stays the boundary. */
    private static String stateOf(AgeSignalsResult signals) {
        Integer lower = signals.ageLower();
        Integer upper = signals.ageUpper();
        if (lower == null) return "unknown";
        if (lower >= 18) return "adult";
        if (upper != null && upper < 13) return "child";
        return "teen";
    }

    private static JSObject result(String state, int errorCode) {
        JSObject out = new JSObject();
        out.put("state", state);
        out.put("errorCode", errorCode);
        return out;
    }

    private static JSObject failure(Exception e) {
        int code = e instanceof AgeSignalsException ? ((AgeSignalsException) e).getErrorCode() : AgeSignalsErrorCode.INTERNAL_ERROR;
        Log.w(TAG, "Age signals unavailable, code " + code); // never log age data
        return result("unknown", code);
    }
}
