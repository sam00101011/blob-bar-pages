var X={idle:["( ＾▽＾)","( ´ ▽ ` )","( ᵔᵕᵔ )"],open:["( ゜o゜)","( ﾟ〇ﾟ )","( ᵒ口ᵒ )"],sleep:["( －_－) zzZ","( ᵕ-ᵕ ) zZ","( ＿ ＿*) Zz"],sad:["( ；-；)","(｡•́︿•̀｡)","( ╥﹏╥ )"]};function D(t,r,e){let a=Math.max(0,Math.min(1,(e-t)/(r-t)));return a*a*(3-2*a)}function H(t){return t-Math.floor(t)}function w(t){let r=Math.max(D(20,22,t)-D(35,37,t),0),e=Math.max(t-40,0),a=25,c=Math.floor(e/25),f=H(Math.sin(c*127.1+311.7)*43758.5453)>=0.7?1:0,s=e-c*25,p=Math.max((D(0,2,s)-D(15,17,s))*f,0);return Math.max(r,p)>0.5}function O(t,r){let e=Math.sin(t*0.6)*0.5+Math.sin(t*0.23)*0.3+Math.sin(t*1.1)*0.2,a=Math.pow(Math.max(Math.min(e,1),0),3);if(w(t))a=0;return a*=1-Math.min(Math.max(r,0),1)*0.95,a}function Y(t){if(t.sadness>0.32||t.sadnessPhase!=="idle")return"sad";if(w(t.shaderTime))return"sleep";if(O(t.shaderTime,t.sadness)>0.18)return"open";return"idle"}function P(t,r,e){let a=t.createShader(r);if(t.shaderSource(a,e),t.compileShader(a),!t.getShaderParameter(a,t.COMPILE_STATUS))console.error(t.getShaderInfoLog(a));return a}function R(t,r,e){let a=t.createProgram(),c=P(t,t.VERTEX_SHADER,r),u=P(t,t.FRAGMENT_SHADER,e);if(t.attachShader(a,c),t.attachShader(a,u),t.linkProgram(a),!t.getProgramParameter(a,t.LINK_STATUS))console.error(t.getProgramInfoLog(a));return{program:a,vertexShader:c,fragmentShader:u}}function N(t,r){let e=t.getContext("webgl2",{alpha:!0,antialias:!1,desynchronized:!0});if(!e)return null;e.clearColor(0,0,0,0);let a=R(e,`#version 300 es
in vec2 a_pos;
out vec2 vUv;
void main(){
  vUv = a_pos * 0.5 + 0.5;
  gl_Position = vec4(a_pos, 0.0, 1.0);
}`,`#version 300 es
precision highp float;

in vec2 vUv;
out vec4 fragColor;

uniform float uTime;
uniform vec2 uRes;
uniform vec2 uCenterPx;
uniform float uScalePx;
uniform vec2 uMouse;
uniform float uPoke;
uniform float uSadness;
uniform float uPokeTime;

#define MAX_STEPS 84
#define MAX_DIST 14.0
#define SURF_DIST 0.001

struct Blob { vec3 pos; float r; };

vec2 smin(float a, float b, float k) {
  float h = clamp(0.5 + 0.5*(b - a)/k, 0.0, 1.0);
  return vec2(mix(b, a, h) - k*h*(1.0-h), h);
}

Blob blobs[4];

void initBlobs(float t, float drift) {
  blobs[0] = Blob(
    vec3(sin(t*0.4)*0.15*drift + cos(t*0.3)*0.08*drift, cos(t*0.35)*0.12*drift + 0.35, sin(t*0.25)*0.06*drift),
    0.55
  );
  blobs[1] = Blob(
    vec3(-0.45 + sin(t*0.45+1.7)*0.1*drift, -0.1 + cos(t*0.38+1.3)*0.08*drift, sin(t*0.3+0.5)*0.05*drift),
    0.44
  );
  blobs[2] = Blob(
    vec3(0.35 + cos(t*0.42+2.1)*0.08*drift, -0.2 + sin(t*0.33+0.9)*0.1*drift, cos(t*0.28+1.8)*0.06*drift),
    0.35
  );
  blobs[3] = Blob(
    vec3(0.6 + sin(t*0.5+2.5)*0.06*drift, -0.05 + cos(t*0.4+1.1)*0.07*drift, sin(t*0.35+2.2)*0.04*drift),
    0.26
  );

  if (abs(uPoke) > 0.001) {
    for (int i = 0; i < 4; i++) {
      vec2 away = blobs[i].pos.xy - uMouse;
      float dist = max(length(away), 0.12);
      float force = uPoke * blobs[i].r / (dist * dist);
      blobs[i].pos.xy += normalize(away) * force * 0.035;
    }
  }
}

float map(vec3 p) {
  float d = length(p - blobs[0].pos) - blobs[0].r;
  for (int i = 1; i < 4; i++) {
    float di = length(p - blobs[i].pos) - blobs[i].r;
    d = smin(d, di, 0.5).x;
  }

  if (abs(uPoke) > 0.001) {
    vec3 pokePos = vec3(uMouse, -0.8);
    float pokeDist = length(p - pokePos);
    float dent = exp(-pokeDist * pokeDist * 8.0) * uPoke * 0.08;
    float bulge = exp(-pokeDist * pokeDist * 1.2) * uPoke * 0.025;
    d += dent - bulge;
  }

  return d;
}

vec3 getNormal(vec3 p) {
  vec2 e = vec2(0.0015, 0.0);
  return normalize(vec3(
    map(p+e.xyy) - map(p-e.xyy),
    map(p+e.yxy) - map(p-e.yxy),
    map(p+e.yyx) - map(p-e.yyx)
  ));
}

vec4 faceFeatures(vec3 p, vec3 blobCenter, float time) {
  vec3 dir = normalize(p - blobCenter);
  if (dir.z > -0.15) return vec4(0.0);

  float lx = dir.x;
  float ly = dir.y;

  float quickSleep = clamp(
    smoothstep(20.0, 22.0, time) - smoothstep(35.0, 37.0, time), 0.0, 1.0);
  quickSleep *= (1.0 - uSadness);
  float tiltDamp = mix(1.0, 0.12, quickSleep);
  float tiltAngle = (sin(time * 0.4) * 0.12 + cos(time * 0.25) * 0.08) * tiltDamp;
  float cs = cos(tiltAngle);
  float sn = sin(tiltAngle);
  float tlx = lx * cs - ly * sn;
  float tly = lx * sn + ly * cs;
  lx = tlx;
  ly = tly;

  float cycle = sin(time * 0.6) * 0.5 + sin(time * 0.23) * 0.3 + sin(time * 1.1) * 0.2;
  float openAmount = pow(clamp(cycle, 0.0, 1.0), 3.0);

  float firstSleepIn = smoothstep(20.0, 22.0, time);
  float firstSleepOut = smoothstep(35.0, 37.0, time);
  float firstSleep = firstSleepIn - firstSleepOut;

  float postFirstTime = max(time - 40.0, 0.0);
  float windowLen = 25.0;
  float windowIdx = floor(postFirstTime / windowLen);
  float rng = fract(sin(windowIdx * 127.1 + 311.7) * 43758.5453);
  float sleepTrigger = step(0.7, rng);
  float windowT = postFirstTime - windowIdx * windowLen;
  float lateSleepIn = smoothstep(0.0, 2.0, windowT);
  float lateSleepOut = smoothstep(15.0, 17.0, windowT);
  float lateSleep = (lateSleepIn - lateSleepOut) * sleepTrigger;

  float sleep = clamp(max(firstSleep, lateSleep), 0.0, 1.0);
  sleep *= (1.0 - uSadness);
  openAmount *= mix(1.0, 0.05, uSadness);
  openAmount *= (1.0 - sleep);

  float eyeSpacing = 0.13;
  float eyeY = 0.07;
  float baseRadius = 0.042 - openAmount * 0.008;

  float blinkPeriod = 3.7;
  float blinkPhase = fract(time / blinkPeriod);
  float blink = smoothstep(0.0, 0.02, blinkPhase) - smoothstep(0.04, 0.06, blinkPhase);
  float blink2Phase = fract((time - 0.25) / (blinkPeriod * 2.3));
  float blink2 = smoothstep(0.0, 0.015, blink2Phase) - smoothstep(0.03, 0.045, blink2Phase);
  blink = max(blink, blink2 * 0.9);

  float wakeT1 = time - 35.0;
  float wakeZone1 = smoothstep(0.0, 0.5, wakeT1) * (1.0 - smoothstep(2.5, 4.0, wakeT1));
  float wakeT2 = windowT - 15.0;
  float wakeZone2 = smoothstep(0.0, 0.5, wakeT2) * (1.0 - smoothstep(2.5, 4.0, wakeT2)) * sleepTrigger;
  float wakeT = wakeZone1 > wakeZone2 ? wakeT1 : wakeT2;
  float wakeZone = max(wakeZone1, wakeZone2);
  float rapidBlink = smoothstep(0.3, 0.5, fract(wakeT * 3.5)) - smoothstep(0.6, 0.8, fract(wakeT * 3.5));
  blink = max(blink, rapidBlink * wakeZone);

  blink = max(blink, sleep);

  float timeSincePoke = time - uPokeTime;
  float pokeBlink = 1.0 - smoothstep(0.04, 0.24, timeSincePoke);
  pokeBlink *= step(0.0, timeSincePoke) * (1.0 - step(0.5, timeSincePoke));
  blink = max(blink, pokeBlink);

  float sleepSlit = 0.15;
  float blinkSlit = 0.05;
  float slitSize = mix(blinkSlit, sleepSlit, sleep);
  float eyeScaleY = mix(1.0, slitSize, blink);
  float eyeRadius = baseRadius;

  vec2 leftEyeCenter = vec2(-eyeSpacing, eyeY);
  vec2 rightEyeCenter = vec2(eyeSpacing, eyeY);

  vec2 leftDelta = vec2(lx, ly) - leftEyeCenter;
  vec2 rightDelta = vec2(lx, ly) - rightEyeCenter;
  float leftDist = length(vec2(leftDelta.x, leftDelta.y / eyeScaleY));
  float rightDist = length(vec2(rightDelta.x, rightDelta.y / eyeScaleY));

  float leftEye = smoothstep(eyeRadius, eyeRadius - 0.01, leftDist);
  float rightEye = smoothstep(eyeRadius, eyeRadius - 0.01, rightDist);
  float eyes = clamp(leftEye + rightEye, 0.0, 1.0);

  vec2 leftLocal = vec2(leftDelta.x, leftDelta.y / eyeScaleY) / eyeRadius;
  vec2 rightLocal = vec2(rightDelta.x, rightDelta.y / eyeScaleY) / eyeRadius;

  float leftShade = leftLocal.y * 0.15 + 0.05;
  float rightShade = rightLocal.y * 0.15 + 0.05;
  float eyeShade = leftEye * leftShade + rightEye * rightShade;

  vec2 highlightOffset = vec2(0.012, 0.016 * eyeScaleY);
  float highlightRadius = 0.015;
  vec2 leftHLDelta = vec2(lx, ly) - (leftEyeCenter + highlightOffset);
  vec2 rightHLDelta = vec2(lx, ly) - (rightEyeCenter + highlightOffset);
  float leftHL = smoothstep(highlightRadius, highlightRadius - 0.008,
    length(vec2(leftHLDelta.x, leftHLDelta.y / eyeScaleY)));
  float rightHL = smoothstep(highlightRadius, highlightRadius - 0.008,
    length(vec2(rightHLDelta.x, rightHLDelta.y / eyeScaleY)));
  float highlight = clamp(leftHL + rightHL, 0.0, 1.0) * (1.0 - blink);

  vec2 hl2Offset = vec2(-0.008, -0.01 * eyeScaleY);
  float hl2Radius = 0.008;
  vec2 leftHL2Delta = vec2(lx, ly) - (leftEyeCenter + hl2Offset);
  vec2 rightHL2Delta = vec2(lx, ly) - (rightEyeCenter + hl2Offset);
  float leftHL2 = smoothstep(hl2Radius, hl2Radius - 0.005,
    length(vec2(leftHL2Delta.x, leftHL2Delta.y / eyeScaleY)));
  float rightHL2 = smoothstep(hl2Radius, hl2Radius - 0.005,
    length(vec2(rightHL2Delta.x, rightHL2Delta.y / eyeScaleY)));
  float highlight2 = clamp(leftHL2 + rightHL2, 0.0, 1.0) * 0.4 * (1.0 - blink);

  vec2 uv = vec2(lx, ly);
  float smileDepth = mix(-0.1, 0.02, uSadness);
  smileDepth = mix(smileDepth, -0.035, sleep);

  vec2 C0 = vec2(-0.18, -0.03);
  vec2 C1 = vec2(0.0, smileDepth);
  vec2 C2 = vec2(0.18, -0.03);

  float centerDist = 999.0;
  float nearestT = 0.0;

  for (int i = 0; i <= 48; i++) {
    float t = float(i) / 48.0;
    float mt = 1.0 - t;
    vec2 cp = mt*mt*C0 + 2.0*mt*t*C1 + t*t*C2;
    float cd = length(uv - cp);
    if (cd < centerDist) {
      centerDist = cd;
      nearestT = t;
    }
  }

  float mouthRadius = 0.012 + openAmount * 0.035;
  float lipWidth = 0.01;
  float mouthSDF = centerDist - mouthRadius;

  float lip = smoothstep(lipWidth, lipWidth - 0.005, abs(mouthSDF))
            * smoothstep(-0.002, 0.003, mouthRadius - 0.013);

  float closedLine = smoothstep(0.012, 0.012 - 0.005, centerDist)
                   * smoothstep(0.003, 0.0, mouthRadius - 0.013);

  lip = clamp(lip + closedLine, 0.0, 1.0);

  float interior = smoothstep(0.0, -0.006, mouthSDF - lipWidth * 0.5)
                 * smoothstep(0.0125, 0.014, mouthRadius);

  float endTaper = smoothstep(0.03, 0.1, nearestT) * smoothstep(0.03, 0.1, 1.0 - nearestT);
  interior *= endTaper;
  interior *= (1.0 - lip);

  vec2 tongueCenter = vec2(0.0, -0.1 - openAmount * 0.012);
  float tongueRx = 0.08 + openAmount * 0.02;
  float tongueRy = 0.008 + openAmount * 0.014;
  vec2 tongueUV = (uv - tongueCenter) / vec2(tongueRx, tongueRy);
  float tongueDist = length(tongueUV);
  float tongue = smoothstep(1.0, 0.7, tongueDist) * interior;

  float darkMask = clamp(eyes + lip, 0.0, 1.0);
  float highlightMask = clamp(highlight + highlight2, 0.0, 1.0);
  float mouthW = clamp(interior, 0.0, 1.0) + tongue * 2.0;

  return vec4(darkMask, highlightMask, eyeShade, mouthW);
}

vec3 studioEnv(vec3 rd) {
  float y = rd.y;
  vec3 env = vec3(0.018, 0.014, 0.028);
  env += vec3(0.025, 0.018, 0.04) * smoothstep(-1.0, 1.0, y);

  vec3 keyDir = normalize(vec3(0.5, 0.7, -0.4));
  float keyDot = max(dot(rd, keyDir), 0.0);
  env += vec3(0.7, 0.65, 0.82) * pow(keyDot, 3.0) * 0.45;
  env += vec3(0.88, 0.85, 1.0) * pow(keyDot, 24.0) * 2.5;

  vec3 fillDir = normalize(vec3(-0.6, 0.3, -0.5));
  float fillDot = max(dot(rd, fillDir), 0.0);
  env += vec3(0.35, 0.25, 0.55) * pow(fillDot, 3.0) * 0.5;
  env += vec3(0.5, 0.4, 0.75) * pow(fillDot, 20.0) * 1.4;

  vec3 accDir = normalize(vec3(0.15, -0.4, -0.7));
  float accDot = max(dot(rd, accDir), 0.0);
  env += vec3(0.3, 0.15, 0.5) * pow(accDot, 5.0) * 0.5;

  vec3 rimDir = normalize(vec3(0.0, 0.15, 0.95));
  float rimDot = max(dot(rd, rimDir), 0.0);
  env += vec3(0.9, 0.85, 1.0) * pow(rimDot, 40.0) * 4.0;
  env += vec3(0.4, 0.35, 0.55) * pow(rimDot, 8.0) * 0.5;

  vec3 srimDir = normalize(vec3(-0.55, 0.4, 0.6));
  float srimDot = max(dot(rd, srimDir), 0.0);
  env += vec3(0.35, 0.3, 0.7) * pow(srimDot, 24.0) * 2.0;
  env += vec3(0.2, 0.18, 0.35) * pow(srimDot, 6.0) * 0.35;

  float bs = exp(-pow((y + 0.3) * 10.0, 2.0));
  env += vec3(0.1, 0.06, 0.14) * bs * 0.5;

  float op = exp(-pow((y - 0.6) * 2.5, 2.0));
  env += vec3(0.12, 0.1, 0.18) * op * 0.5;

  env += vec3(0.03, 0.02, 0.05) * (1.0 - abs(y));

  return env;
}

vec3 fresnelSchlick(float cosTheta, vec3 F0) {
  return F0 + (1.0 - F0) * pow(1.0 - cosTheta, 5.0);
}

float calcAO(vec3 p, vec3 n) {
  float ao = 0.0;
  float s = 1.0;
  for (int i = 0; i < 4; i++) {
    float dist = 0.02 + 0.1 * float(i);
    ao += (dist - map(p + n * dist)) * s;
    s *= 0.55;
  }
  return clamp(1.0 - ao * 2.5, 0.0, 1.0);
}

float curvature(vec3 p, vec3 n) {
  float dn = map(p + n * 0.012);
  return clamp((0.012 - dn) * 18.0, 0.0, 1.0);
}

void main() {
  float firstSleepMain = clamp(
    smoothstep(20.0, 22.0, uTime) - smoothstep(35.0, 37.0, uTime), 0.0, 1.0);
  float pfTime = max(uTime - 40.0, 0.0);
  float wIdx = floor(pfTime / 25.0);
  float wRng = fract(sin(wIdx * 127.1 + 311.7) * 43758.5453);
  float wTrig = step(0.7, wRng);
  float wT = pfTime - wIdx * 25.0;
  float lateSleepMain = clamp(
    (smoothstep(0.0, 2.0, wT) - smoothstep(15.0, 17.0, wT)) * wTrig, 0.0, 1.0);
  float sleepMain = max(firstSleepMain, lateSleepMain);
  sleepMain *= (1.0 - uSadness);

  float drift = mix(1.0, 0.12, sleepMain);
  initBlobs(uTime, drift);

  vec2 centerPx = vec2(uCenterPx.x, uRes.y - uCenterPx.y);
  vec2 uv = (gl_FragCoord.xy - centerPx) / uScalePx;

  vec3 ro = vec3(0.0, 0.15, -2.5);
  vec3 rd = normalize(vec3(uv, 1.2));

  float ca = sin(uTime * 0.1) * 0.018 * drift;
  float cb = cos(uTime * 0.08) * 0.01 * drift;
  mat2 rotY = mat2(cos(ca), -sin(ca), sin(ca), cos(ca));
  rd.xz = rotY * rd.xz;
  ro.xz = rotY * ro.xz;
  mat2 rotX = mat2(cos(cb), -sin(cb), sin(cb), cos(cb));
  rd.yz = rotX * rd.yz;

  float t = 0.0;
  float d;
  vec3 p;
  bool hit = false;

  for (int i = 0; i < MAX_STEPS; i++) {
    p = ro + rd * t;
    d = map(p);
    if (d < SURF_DIST) { hit = true; break; }
    if (t > MAX_DIST) break;
    t += d * 0.65;
  }

  vec3 bgColor = vec3(0.0);
  {
    vec2 bgUv = uv;
    float bgDist = length(bgUv);
    bgColor += vec3(0.012, 0.008, 0.025) * exp(-bgDist * 3.0);
    bgColor += vec3(0.008, 0.005, 0.016) * exp(-bgDist * 1.5);
    float grain = fract(sin(dot(gl_FragCoord.xy, vec2(12.9898, 78.233))) * 43758.5453);
    bgColor += vec3(grain * 0.003);
  }

  vec3 color = vec3(0.0);
  float alpha = 0.0;

  if (hit) {
    float pixelWidth = t / min(uRes.x, uRes.y);
    float edgeAlpha = smoothstep(SURF_DIST + pixelWidth * 3.0, SURF_DIST, d);

    vec3 n = getNormal(p);
    vec3 V = -rd;
    float NdotV = max(dot(n, V), 0.0);

    vec3 F0 = vec3(0.68, 0.62, 0.78);
    vec3 F = fresnelSchlick(NdotV, F0);

    vec3 refl = reflect(rd, n);
    vec3 envCol = studioEnv(refl);

    vec3 r2 = reflect(rd, normalize(n + vec3(0.04, 0.03, -0.02)));
    vec3 r3 = reflect(rd, normalize(n + vec3(-0.03, 0.04, 0.02)));
    vec3 r4 = reflect(rd, normalize(n + vec3(0.02, -0.03, 0.035)));
    vec3 envBlur = (envCol + studioEnv(r2) + studioEnv(r3) + studioEnv(r4)) * 0.25;

    float curv = curvature(p, n);
    vec3 finalEnv = mix(envCol, envBlur, 0.35 + curv * 0.2);

    vec3 keyDir = normalize(vec3(0.5, 0.7, -0.4));
    vec3 fillDir = normalize(vec3(-0.6, 0.3, -0.5));
    vec3 rimDir = normalize(vec3(0.0, 0.15, 0.95));

    float specK = pow(max(dot(n, normalize(keyDir + V)), 0.0), 48.0) * 2.5;
    float specF = pow(max(dot(n, normalize(fillDir + V)), 0.0), 32.0) * 1.2;
    float specR = pow(max(dot(n, normalize(rimDir + V)), 0.0), 64.0) * 3.0;
    vec3 spec = vec3(0.85, 0.8, 1.0) * (specK + specF + specR);

    float ao = pow(calcAO(p, n), 1.15);

    color = (finalEnv * F + spec) * ao;

    float edge = pow(1.0 - NdotV, 3.0);
    color += vec3(0.15, 0.1, 0.28) * edge * ao * 0.4;
    color += vec3(0.08, 0.04, 0.14) * curv * ao * 0.35;
    color *= mix(1.0, 0.78, curv * 0.35);
    color += vec3(0.012, 0.008, 0.022) * ao;

    float distToBlob0 = length(p - blobs[0].pos) - blobs[0].r;
    float onBlob0 = smoothstep(0.15, 0.0, abs(distToBlob0));

    if (onBlob0 > 0.01) {
      vec4 face = faceFeatures(p, blobs[0].pos, uTime);
      float darkMask = face.x;
      float hlMask = face.y;
      float eyeShade = face.z;
      float mouthW = face.w;
      float mouthInterior = clamp(mouthW, 0.0, 1.0);
      float tongue = clamp((mouthW - 1.0) * 0.5, 0.0, 1.0);

      vec3 featureDark = vec3(0.018, 0.012, 0.032);
      vec3 featureLight = vec3(0.045, 0.035, 0.065);
      vec3 featureFlat = mix(featureDark, featureLight, clamp(eyeShade + 0.5, 0.0, 1.0));

      float surfLum = dot(color, vec3(0.2126, 0.7152, 0.0722));
      vec3 featureCol = featureFlat * mix(1.0, surfLum * 4.0, 0.5);

      vec3 mouthDarkFlat = vec3(0.14, 0.035, 0.055);
      vec3 mouthDarkCol = mouthDarkFlat * mix(1.0, surfLum * 3.0, 0.5);

      vec3 tongueFlat = vec3(0.35, 0.18, 0.16);
      vec3 tongueCol = tongueFlat * mix(1.0, surfLum * 3.0, 0.5);

      color = mix(color, mouthDarkCol, mouthInterior * onBlob0 * 0.92);
      color = mix(color, tongueCol, tongue * onBlob0 * 0.85);
      color = mix(color, featureCol, darkMask * onBlob0 * 0.93);

      vec3 hlFlat = vec3(0.75, 0.72, 0.88);
      vec3 hlColor = hlFlat * mix(1.0, surfLum * 5.0, 0.5);
      color = mix(color, hlColor, hlMask * onBlob0 * 0.95);
    }

    vec3 surfColor = color * (2.2 * color + 0.06) / (color * (2.2 * color + 0.55) + 0.16);
    color = mix(bgColor, surfColor, edgeAlpha);
    alpha = clamp(edgeAlpha + edge * 0.24 + curv * 0.08, 0.0, 1.0);
  }

  vec2 vc = vUv - 0.5;
  color *= 1.0 - dot(vc, vc) * 0.25;

  fragColor = vec4(pow(max(color, vec3(0.0)), vec3(1.0/2.2)), alpha);
}`),c=R(e,`#version 300 es
    in vec2 a_pos;
    out vec2 vUv;
    void main(){ vUv = a_pos * 0.5 + 0.5; gl_Position = vec4(a_pos, 0, 1); }`,`#version 300 es
    precision highp float;
    in vec2 vUv;
    out vec4 fragColor;
    uniform sampler2D uPrev;
    uniform float uMix;
    void main(){
      vec4 prev = texture(uPrev, vUv);
      fragColor = vec4(prev.rgb, prev.a * uMix);
    }`),u=e.createBuffer();e.bindBuffer(e.ARRAY_BUFFER,u),e.bufferData(e.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,1,1]),e.STATIC_DRAW);let f=e.getAttribLocation(a.program,"a_pos");e.useProgram(a.program),e.enableVertexAttribArray(f),e.vertexAttribPointer(f,2,e.FLOAT,!1,0,0);let s={time:e.getUniformLocation(a.program,"uTime"),resolution:e.getUniformLocation(a.program,"uRes"),centerPx:e.getUniformLocation(a.program,"uCenterPx"),scalePx:e.getUniformLocation(a.program,"uScalePx"),mouse:e.getUniformLocation(a.program,"uMouse"),poke:e.getUniformLocation(a.program,"uPoke"),sadness:e.getUniformLocation(a.program,"uSadness"),pokeTime:e.getUniformLocation(a.program,"uPokeTime")},p=e.getAttribLocation(c.program,"a_pos"),T=e.getUniformLocation(c.program,"uPrev"),b=e.getUniformLocation(c.program,"uMix"),h=e.createTexture();e.bindTexture(e.TEXTURE_2D,h),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_MIN_FILTER,e.LINEAR),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_MAG_FILTER,e.LINEAR),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_WRAP_S,e.CLAMP_TO_EDGE),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_WRAP_T,e.CLAMP_TO_EDGE);let i={elapsedMs:0,height:0,lastFrameTs:0,rafId:0,running:!1,startTs:null,width:0};function k(l,m,o){let d=Math.max(1,Math.round(l*o)),n=Math.max(1,Math.round(m*o));if(i.width===d&&i.height===n)return;i.width=d,i.height=n,t.width=d,t.height=n,e.bindTexture(e.TEXTURE_2D,h),e.texImage2D(e.TEXTURE_2D,0,e.RGBA,d,n,0,e.RGBA,e.UNSIGNED_BYTE,null)}function y(l){if(i.startTs===null)i.startTs=l-i.elapsedMs;i.lastFrameTs=l;let m=(l-i.startTs)*0.001,o=r;o.shaderTime=m;let d=(l-(o.lastPokeTs||0))*0.001;if(o.lastPokeTs&&d<4)o.pokeStrength=Math.exp(-1.8*d)*Math.cos(3.5*d);else o.pokeStrength=0;let n=performance.now();if(o.sadnessPhase==="idle"&&n-o.lastPokeMs>8000)o.pokeCount=0;if(o.sadnessPhase==="ramp"){let g=(n-o.sadnessStartMs)/1000;if(o.sadness=Math.min(g/1,1),g>=1)o.sadnessPhase="hold",o.sadnessHoldStart=n}else if(o.sadnessPhase==="hold"){if(o.sadness=1,n-o.sadnessHoldStart>12000)o.sadnessPhase="decay",o.sadnessDecayStart=n}else if(o.sadnessPhase==="decay"){let g=(n-o.sadnessDecayStart)/1000;if(o.sadness=Math.max(1-g/3,0),o.sadness<=0)o.sadnessPhase="idle",o.sadness=0,o.pokeCount=0}e.viewport(0,0,t.width,t.height),e.useProgram(a.program),e.bindBuffer(e.ARRAY_BUFFER,u),e.enableVertexAttribArray(f),e.vertexAttribPointer(f,2,e.FLOAT,!1,0,0),e.uniform1f(s.time,m),e.uniform2f(s.resolution,t.width,t.height),e.uniform2f(s.centerPx,o.centerPxX,o.centerPxY),e.uniform1f(s.scalePx,o.scalePx),e.uniform2f(s.mouse,o.pokeWorldX,o.pokeWorldY),e.uniform1f(s.poke,o.pokeStrength),e.uniform1f(s.sadness,o.sadness),e.uniform1f(s.pokeTime,o.pokeShaderTime),e.drawArrays(e.TRIANGLE_STRIP,0,4),e.enable(e.BLEND),e.blendFunc(e.SRC_ALPHA,e.ONE_MINUS_SRC_ALPHA),e.useProgram(c.program),e.enableVertexAttribArray(p),e.vertexAttribPointer(p,2,e.FLOAT,!1,0,0),e.activeTexture(e.TEXTURE0),e.bindTexture(e.TEXTURE_2D,h),e.uniform1i(T,0),e.uniform1f(b,0.04),e.drawArrays(e.TRIANGLE_STRIP,0,4),e.disable(e.BLEND),e.bindTexture(e.TEXTURE_2D,h),e.copyTexSubImage2D(e.TEXTURE_2D,0,0,0,0,0,t.width,t.height)}function S(l){if(y(l),i.running)i.rafId=requestAnimationFrame(S)}function E(){if(!i.running)return;if(i.running=!1,cancelAnimationFrame(i.rafId),i.rafId=0,i.startTs!==null){let l=i.lastFrameTs||performance.now();i.elapsedMs=Math.max(0,l-i.startTs),i.startTs=null}}return{drawStill(){if(y(performance.now()),i.startTs!==null)i.elapsedMs=Math.max(0,i.lastFrameTs-i.startTs),i.startTs=null},pause:E,resize:k,resume(){if(i.running)return;i.running=!0,i.rafId=requestAnimationFrame(S)}}}var v=document.getElementById("home-blob-canvas"),x=document.getElementById("home-blob-panel"),A=document.getElementById("home-blob-hitbox");if(!(v instanceof HTMLCanvasElement)||!(x instanceof HTMLElement)||!(A instanceof HTMLElement))document.title="( ᵔᵕᵔ )";else{let s=function(){let l=Y(t);if(l!==u)u=l,c=0;let m=X[l];document.title=m[c%m.length],c+=1},p=function(){if(f||document.hidden||!e)return;s(),f=window.setInterval(s,700)},T=function(){if(f)window.clearInterval(f),f=0;document.title="( ᵔᵕᵔ )"},b=function(){a=0;let l=Math.min(window.devicePixelRatio||1,1.75),m=x.getBoundingClientRect();if(r)r.resize(m.width,m.height,l);t.centerPxX=v.width*0.5,t.centerPxY=v.height*0.5,t.scalePx=Math.max(v.width*1.2727272727272727,1)},h=function(){if(a)return;a=requestAnimationFrame(b)},i=function(){let l=!document.hidden&&e;if(r)if(l)r.resume();else r.pause();if(l)p();else T()},k=function(l,m){let o=performance.now();if(o-t.lastPokeMs<350)return;let d=Math.min(window.devicePixelRatio||1,1.75),n=x.getBoundingClientRect(),g=l||n.left+n.width*0.5,M=m||n.top+n.height*0.5,L=n.width>0?v.width/n.width:d,_=n.height>0?v.height/n.height:d,C=(g-n.left)*L,F=(M-n.top)*_,I=(C-t.centerPxX)/t.scalePx,U=-(F-t.centerPxY)/t.scalePx,z=I/1.2*2.5,B=U/1.2*2.5+0.15;if(t.pokeWorldX=z,t.pokeWorldY=B,t.pokeStrength=1,t.pokeShaderTime=t.shaderTime,t.lastPokeTs=o,t.lastPokeMs=o,t.sadnessPhase==="idle"){if(w(t.shaderTime))t.sadnessPhase="ramp",t.sadnessStartMs=o,t.pokeCount=0;else if(t.pokeCount+=1,t.pokeCount>=6)t.sadnessPhase="ramp",t.sadnessStartMs=o}};G=s,K=p,V=T,q=b,J=h,W=i,Z=k;let t={centerPxX:0,centerPxY:0,lastPokeMs:0,lastPokeTs:0,pokeCount:0,pokeShaderTime:-10,pokeStrength:0,pokeWorldX:0,pokeWorldY:-10,sadness:0,sadnessDecayStart:0,sadnessHoldStart:0,sadnessPhase:"idle",sadnessStartMs:0,scalePx:360,shaderTime:0},r=N(v,t),e=!0,a=0,c=0,u="idle",f=0;A.addEventListener("click",(l)=>{k(l.clientX,l.clientY)}),window.addEventListener("resize",()=>{h()}),(typeof ResizeObserver>"u"?null:new ResizeObserver(()=>{h()}))?.observe(x);let S=()=>{if(i(),!document.hidden)h()};document.addEventListener("visibilitychange",S),(typeof IntersectionObserver>"u"?null:new IntersectionObserver(([l])=>{e=l?.isIntersecting??!0,i()},{threshold:0.05}))?.observe(x),h(),requestAnimationFrame(()=>{if(r)r.drawStill();i()})}var G,K,V,q,J,W,Z;
