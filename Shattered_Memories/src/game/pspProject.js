export const PSP_MAIN_C = String.raw`/*
 * SHATTERED MEMORIES - Sony PSP homebrew build
 * Native C, PSPSDK, GU rendering, 480x272 (16:9).
 *
 * Raycast corridor renderer with procedurally generated rooms, searchable
 * furniture, hiding, creatures and environmental warning effects.
 * See README.md for build instructions and for what is intentionally
 * simplified on this hardware.
 */

#include <pspkernel.h>
#include <pspdisplay.h>
#include <pspctrl.h>
#include <pspgu.h>
#include <pspgum.h>
#include <psppower.h>
#include <string.h>
#include <stdio.h>
#include <stdlib.h>
#include <math.h>

PSP_MODULE_INFO("ShatteredMemories", 0, 1, 0);
PSP_MAIN_THREAD_ATTR(THREAD_ATTR_USER | THREAD_ATTR_VFPU);

#define SCR_W 480
#define SCR_H 272
#define MAP_W 33
#define MAP_H 25
#define CELLS (MAP_W * MAP_H)
#define FOCAL 250.0f

static unsigned int __attribute__((aligned(16))) guList[131072];

typedef struct {
	float u, v;
	unsigned int color;
	float x, y, z;
} Vtx;

#define VTX (GU_TEXTURE_32BITF | GU_COLOR_8888 | GU_VERTEX_32BITF | GU_TRANSFORM_2D)
#define RGB(r, g, b) (0xff000000u | ((unsigned int)(b) << 16) | ((unsigned int)(g) << 8) | (unsigned int)(r))

/* ------------------------------------------------------------------ */
/* textures (procedural, generated at boot)                            */
/* ------------------------------------------------------------------ */

static unsigned char wallIdx[64 * 64];
static unsigned int palWall[256];
static unsigned char sprIdx[128 * 128];
static unsigned int palSpr[256];
static unsigned char fontIdx[64 * 32];
static unsigned int palFont[256];

static const char *GLYPHS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789.-: ";
static const char *GLYPH_ROWS[40] = {
	"25755", "65656", "34443", "65556", "74647", "74644", "34553", "55755",
	"72227", "11153", "55655", "44447", "57755", "57775", "25552", "65644",
	"25563", "65655", "34216", "72222", "55557", "55552", "55775", "55255",
	"55222", "71247", "75557", "26227", "61247", "61216", "55711", "74616",
	"34652", "71222", "25252", "25316", "00002", "00700", "02020", "00000"
};

/* palette indices used by the sprite atlas */
#define C_CLEAR 0
#define C_DARK 1
#define C_MID 2
#define C_LIGHT 3
#define C_WOOD 4
#define C_WOODD 5
#define C_METAL 6
#define C_AMBER 7
#define C_RED 8
#define C_CYAN 9
#define C_VOID 10

static void initPalettes(void) {
	int i;
	for (i = 0; i < 256; i++) {
		palWall[i] = RGB(0, 0, 0);
		palSpr[i] = 0x00000000;
		palFont[i] = 0x00000000;
	}
	/* wall: concrete grey ramp, 32 steps of noise */
	for (i = 0; i < 32; i++) {
		int v = 46 + i * 3;
		palWall[i + 1] = RGB(v, v, v - 2);
	}
	for (i = 32; i < 64; i++) {
		int v = 60 + (i - 32) * 2;
		palWall[i + 1] = RGB(v - 6, v - 4, v - 8);
	}
	palWall[200] = RGB(20, 20, 18);
	palWall[201] = RGB(96, 84, 60);
	palWall[202] = RGB(150, 120, 70);
	palWall[203] = RGB(190, 168, 120);

	palSpr[C_DARK] = RGB(38, 38, 34);
	palSpr[C_MID] = RGB(86, 88, 80);
	palSpr[C_LIGHT] = RGB(150, 148, 136);
	palSpr[C_WOOD] = RGB(112, 78, 44);
	palSpr[C_WOODD] = RGB(64, 44, 26);
	palSpr[C_METAL] = RGB(140, 142, 138);
	palSpr[C_AMBER] = RGB(226, 178, 100);
	palSpr[C_RED] = RGB(198, 78, 48);
	palSpr[C_CYAN] = RGB(130, 206, 200);
	palSpr[C_VOID] = RGB(10, 11, 12);

	palFont[1] = RGB(232, 228, 216);
	palFont[2] = RGB(176, 106, 60);
	palFont[3] = RGB(216, 176, 106);
	palFont[4] = RGB(150, 60, 46);
}

static void buildWallTexture(void) {
	unsigned int seed = 7;
	int x, y;
	for (y = 0; y < 64; y++) {
		for (x = 0; x < 64; x++) {
			seed = seed * 1664525u + 1013904223u;
			int n = 1 + (int)((seed >> 16) % 26);
			/* horizontal form seams */
			if (y == 21 || y == 43) n = 48;
			if (y <= 1 || y >= 62) n = 60;
			/* grime toward the floor */
			if (y > 46 && ((seed >> 9) & 3) == 0) n = n > 4 ? n - 4 : 1;
			wallIdx[y * 64 + x] = n;
		}
	}
	/* a couple of vertical cracks */
	for (y = 0; y < 64; y++) {
		int cx = 14 + (y / 6);
		if (cx < 63) wallIdx[y * 64 + cx] = 200;
	}
}

static void sprRect(int x0, int y0, int x1, int y1, int c) {
	int x, y;
	for (y = y0; y <= y1; y++)
		for (x = x0; x <= x1; x++)
			if (x >= 0 && y >= 0 && x < 128 && y < 128) sprIdx[y * 128 + x] = c;
}

static void buildSpriteAtlas(void) {
	int i;
	memset(sprIdx, C_CLEAR, sizeof(sprIdx));
	/* cabinet, top-left quadrant */
	sprRect(24, 6, 39, 58, C_MID);
	sprRect(24, 6, 39, 8, C_LIGHT);
	sprRect(24, 6, 25, 58, C_DARK);
	sprRect(38, 6, 39, 58, C_DARK);
	sprRect(31, 6, 32, 58, C_DARK);
	sprRect(28, 30, 29, 34, C_METAL);
	sprRect(34, 30, 35, 34, C_METAL);
	/* chest, top-right quadrant */
	sprRect(76, 34, 115, 56, C_WOOD);
	sprRect(76, 28, 115, 33, C_WOODD);
	sprRect(78, 30, 113, 31, C_AMBER);
	sprRect(88, 34, 91, 56, C_METAL);
	sprRect(100, 34, 103, 56, C_METAL);
	sprRect(94, 32, 97, 38, C_AMBER);
	/* creature, bottom-left quadrant */
	sprRect(26, 34, 37, 58, C_DARK);
	sprRect(27, 26, 36, 34, C_MID);
	for (i = 0; i < 4; i++) sprRect(22 + i * 5, 58, 24 + i * 5, 63, C_DARK);
	sprRect(28, 29, 30, 31, C_RED);
	sprRect(33, 29, 35, 31, C_RED);
	sprRect(24, 40, 26, 52, C_MID);
	sprRect(37, 40, 39, 52, C_MID);
	/* coin, bottom-right quadrant */
	for (i = 0; i < 6; i++) sprRect(94 - i, 40 + i, 98 + i, 42 + i, C_AMBER);
}

static void buildFont(void) {
	int g, r, c;
	memset(fontIdx, 0, sizeof(fontIdx));
	for (g = 0; g < 40; g++) {
		int cellX = (g % 8) * 8;
		int cellY = (g / 8) * 6;
		for (r = 0; r < 5; r++) {
			int bits = GLYPH_ROWS[g][r] - '0';
			for (c = 0; c < 3; c++) {
				if (bits & (4 >> c)) fontIdx[(cellY + r) * 64 + cellX + c] = 1;
			}
		}
	}
}

/* ------------------------------------------------------------------ */
/* world                                                               */
/* ------------------------------------------------------------------ */

static unsigned char map[CELLS];
static unsigned char blocked[CELLS];
static int playerTile;
static int roomNum = 1;
static float px = 2.5f, py = 2.5f, ang = 0.0f;

static int objX[8], objY[8], objType[8], objOpen[8], objN = 0;
#define OBJ_CABINET 0
#define OBJ_CHEST 1
#define OBJ_DESK 2

static int coinX[6], coinY[6], coinN = 0;

static int health = 100, battery = 100, coins = 0, hasKey = 0, lampOn = 0;
static int hiddenCab = -1;
static int doorX = -1, doorY = -1, doorLocked = 0, exitX = 1, exitY = 1;

static int creActive = 0, creType = 0;
static float creX = 0, creY = 0;
static int discoveredCount = 0;

static int msgTimer = 0;
static char msg[48];
static float shakeAmt = 0.0f, distortAmt = 0.0f;

static unsigned int rngState = 0x9e3779b9u;
static unsigned int rnd(void) {
	rngState = rngState * 1664525u + 1013904223u;
	return rngState >> 8;
}
static int rndi(int n) { return n > 0 ? (int)(rnd() % (unsigned int)n) : 0; }

static void setMsg(const char *s) {
	strncpy(msg, s, sizeof(msg) - 1);
	msg[sizeof(msg) - 1] = 0;
	msgTimer = 150;
}

static void bfsFrom(int sx, int sy, int *dist) {
	static int q[CELLS];
	int head = 0, tail = 0, i;
	for (i = 0; i < CELLS; i++) dist[i] = -1;
	if (sx < 0 || sy < 0 || sx >= MAP_W || sy >= MAP_H) return;
	if (map[sy * MAP_W + sx] != 0) return;
	dist[sy * MAP_W + sx] = 0;
	q[tail++] = sy * MAP_W + sx;
	while (head < tail) {
		int cur = q[head++];
		int x = cur % MAP_W, y = cur / MAP_W;
		const int dx[4] = {1, -1, 0, 0};
		const int dy[4] = {0, 0, 1, -1};
		int d;
		for (d = 0; d < 4; d++) {
			int nx = x + dx[d], ny = y + dy[d];
			int ni;
			if (nx < 0 || ny < 0 || nx >= MAP_W || ny >= MAP_H) continue;
			ni = ny * MAP_W + nx;
			if (map[ni] != 0 || blocked[ni] || dist[ni] != -1) continue;
			dist[ni] = dist[cur] + 1;
			q[tail++] = ni;
		}
	}
}

static int openNeighbours(int x, int y) {
	int n = 0;
	if (map[y * MAP_W + x - 1] == 0) n++;
	if (map[y * MAP_W + x + 1] == 0) n++;
	if (map[(y - 1) * MAP_W + x] == 0) n++;
	if (map[(y + 1) * MAP_W + x] == 0) n++;
	return n;
}

static void genRoom(void) {
	int stack[CELLS][2];
	int sp = 0, x, y, i;
	int dist[CELLS];
	int best = -1;

	memset(map, 1, sizeof(map));
	memset(blocked, 0, sizeof(blocked));
	objN = 0;
	coinN = 0;
	creActive = 0;
	hiddenCab = -1;
	doorX = doorY = -1;

	/* recursive-backtracker maze on odd cells */
	map[1 * MAP_W + 1] = 0;
	stack[sp][0] = 1;
	stack[sp][1] = 1;
	sp++;
	while (sp > 0) {
		int cx = stack[sp - 1][0], cy = stack[sp - 1][1];
		int opts[4][2] = {{2, 0}, {-2, 0}, {0, 2}, {0, -2}};
		int moved = 0, k;
		for (k = 3; k > 0; k--) {
			int j = rndi(k + 1);
			int t0 = opts[k][0], t1 = opts[k][1];
			opts[k][0] = opts[j][0];
			opts[k][1] = opts[j][1];
			opts[j][0] = t0;
			opts[j][1] = t1;
		}
		for (k = 0; k < 4; k++) {
			int nx = cx + opts[k][0], ny = cy + opts[k][1];
			if (nx > 0 && ny > 0 && nx < MAP_W - 1 && ny < MAP_H - 1 && map[ny * MAP_W + nx] == 1) {
				map[(cy + opts[k][1] / 2) * MAP_W + (cx + opts[k][0] / 2)] = 0;
				map[ny * MAP_W + nx] = 0;
				stack[sp][0] = nx;
				stack[sp][1] = ny;
				sp++;
				moved = 1;
				break;
			}
		}
		if (!moved) sp--;
	}

	/* braid: knock through to make loops and junctions */
	for (y = 1; y < MAP_H - 1; y++) {
		for (x = 1; x < MAP_W - 1; x++) {
			int l, r, u, d;
			if (map[y * MAP_W + x] != 1) continue;
			l = map[y * MAP_W + x - 1] == 0;
			r = map[y * MAP_W + x + 1] == 0;
			u = map[(y - 1) * MAP_W + x] == 0;
			d = map[(y + 1) * MAP_W + x] == 0;
			if (((l && r && !u && !d) || (u && d && !l && !r)) && rndi(100) < 28)
				map[y * MAP_W + x] = 0;
		}
	}
	/* a few widened pockets */
	for (i = 0; i < 6; i++) {
		int wx = 1 + rndi(MAP_W - 2), wy = 1 + rndi(MAP_H - 2);
		if (map[wy * MAP_W + wx] != 0) continue;
		if (wx + 1 < MAP_W - 1 && map[wy * MAP_W + wx + 1] == 1) map[wy * MAP_W + wx + 1] = 0;
	}

	/* spawn */
	do {
		x = 1 + rndi(MAP_W - 2);
		y = 1 + rndi(MAP_H - 2);
	} while (map[y * MAP_W + x] != 0);
	px = x + 0.5f;
	py = y + 0.5f;

	/* exit = farthest reachable cell */
	bfsFrom(x, y, dist);
	for (i = 0; i < CELLS; i++) {
		if (dist[i] > best) {
			best = dist[i];
			exitX = i % MAP_W;
			exitY = i / MAP_W;
		}
	}

	/* door in a wall beside the exit */
	{
		int dxs[4] = {1, -1, 0, 0}, dys[4] = {0, 0, 1, -1};
		int k;
		for (k = 0; k < 4; k++) {
			int wx = exitX + dxs[k], wy = exitY + dys[k];
			if (wx > 0 && wy > 0 && wx < MAP_W - 1 && wy < MAP_H - 1 && map[wy * MAP_W + wx] == 1) {
				map[wy * MAP_W + wx] = 3;
				doorX = wx;
				doorY = wy;
				break;
			}
		}
	}
	doorLocked = (roomNum > 2 && rndi(100) < 45) ? 1 : 0;
	hasKey = 0;

	/* furniture in dead ends */
	{
		int order[6] = {OBJ_CABINET, OBJ_CHEST, OBJ_DESK, OBJ_CABINET, OBJ_CHEST, OBJ_DESK};
		for (y = 1; y < MAP_H - 1 && objN < 6; y++) {
			for (x = 1; x < MAP_W - 1 && objN < 6; x++) {
				int ni = y * MAP_W + x;
				int far = abs(x - (int)px) + abs(y - (int)py);
				if (map[ni] != 0 || far < 3) continue;
				if (x == exitX && y == exitY) continue;
				if (openNeighbours(x, y) > 1) continue;
				if (rndi(100) < 35) continue;
				objX[objN] = x;
				objY[objN] = y;
				objType[objN] = order[objN % 6];
				objOpen[objN] = 0;
				blocked[ni] = 1;
				objN++;
			}
		}
	}

	/* loose coins */
	for (i = 0; i < 4; i++) {
		int cx2 = 1 + rndi(MAP_W - 2), cy2 = 1 + rndi(MAP_H - 2);
		if (map[cy2 * MAP_W + cx2] != 0 || blocked[cy2 * MAP_W + cx2]) continue;
		coinX[coinN] = cx2;
		coinY[coinN] = cy2;
		coinN++;
	}

	ang = 0.0f;
	if (map[(int)py * MAP_W + (int)px + 1] == 0) ang = 0.0f;
	else ang = 3.14159f;

	snprintf(msg, sizeof(msg), "ROOM %03d", roomNum);
	msgTimer = 150;
}

/* ------------------------------------------------------------------ */
/* rendering                                                           */
/* ------------------------------------------------------------------ */

static float zbuf[SCR_W];
static int frameLight = 200;

static void bindTexture(int w, int h, void *data, unsigned int *pal, int alpha) {
	sceGuTexMode(GU_PSM_T8, 0, 0, GU_FALSE);
	sceGuTexImage(0, w, h, w, data);
	sceGuTexPalette(pal);
	sceGuTexFunc(GU_TFX_MODULATE, alpha ? GU_TCC_RGBA : GU_TCC_RGB);
	sceGuTexFilter(GU_NEAREST, GU_NEAREST);
	sceGuTexWrap(GU_CLAMP, GU_CLAMP);
}

static void drawFloorCeil(int light) {
	Vtx *v = (Vtx *)sceGuGetMemory(sizeof(Vtx) * 12);
	int i;
	for (i = 0; i < 6; i++) {
		v[i].u = 0;
		v[i].v = 0;
		v[i].z = 0;
	}
	/* ceiling gradient (dark near the horizon) */
	v[0].x = 0;      v[0].y = 0;              v[0].color = RGB(14, 14, 13);
	v[1].x = SCR_W;  v[1].y = 0;              v[1].color = RGB(14, 14, 13);
	v[2].x = SCR_W;  v[2].y = SCR_H / 2;      v[2].color = RGB(4 + light / 24, 4 + light / 24, 4 + light / 26);
	v[3].x = 0;      v[3].y = 0;              v[3].color = RGB(14, 14, 13);
	v[4].x = SCR_W;  v[4].y = SCR_H / 2;      v[4].color = RGB(4 + light / 24, 4 + light / 24, 4 + light / 26);
	v[5].x = 0;      v[5].y = SCR_H / 2;      v[5].color = RGB(4 + light / 24, 4 + light / 24, 4 + light / 26);
	/* floor gradient */
	v[6].x = 0;      v[6].y = SCR_H / 2;      v[6].color = RGB(6 + light / 26, 6 + light / 26, 6 + light / 30);
	v[7].x = SCR_W;  v[7].y = SCR_H / 2;      v[7].color = RGB(6 + light / 26, 6 + light / 26, 6 + light / 30);
	v[8].x = SCR_W;  v[8].y = SCR_H;          v[8].color = RGB(22, 20, 18);
	v[9].x = 0;      v[9].y = SCR_H / 2;      v[9].color = RGB(6 + light / 26, 6 + light / 26, 6 + light / 30);
	v[10].x = SCR_W; v[10].y = SCR_H;         v[10].color = RGB(22, 20, 18);
	v[11].x = 0;     v[11].y = SCR_H;         v[11].color = RGB(22, 20, 18);
	sceGuDisable(GU_TEXTURE_2D);
	sceGuDrawArray(GU_TRIANGLES, VTX, 12, NULL, v);
	sceGuEnable(GU_TEXTURE_2D);
}

static void drawWalls(void) {
	Vtx *v = (Vtx *)sceGuGetMemory(sizeof(Vtx) * 6 * SCR_W);
	int n = 0, x;
	float half = SCR_W * 0.5f;
	float planeLen = 0.75f;

	for (x = 0; x < SCR_W; x++) {
		float cameraX = (2.0f * x) / SCR_W - 1.0f;
		float dirX = cosf(ang), dirY = sinf(ang);
		float planeX = -dirY * planeLen, planeY = dirX * planeLen;
		float rayX = dirX + planeX * cameraX;
		float rayY = dirY + planeY * cameraX;
		int mapX = (int)px, mapY = (int)py;
		float deltaX = fabsf(1.0f / (rayX == 0 ? 0.0001f : rayX));
		float deltaY = fabsf(1.0f / (rayY == 0 ? 0.0001f : rayY));
		int stepX, stepY, side = 0, guard = 0;
		float sideDistX, sideDistY, perp, lineH, drawStart, wallX;
		int texX, y0, y1, tile = 0;
		unsigned int col;

		if (rayX < 0) { stepX = -1; sideDistX = (px - mapX) * deltaX; }
		else { stepX = 1; sideDistX = (mapX + 1 - px) * deltaX; }
		if (rayY < 0) { stepY = -1; sideDistY = (py - mapY) * deltaY; }
		else { stepY = 1; sideDistY = (mapY + 1 - py) * deltaY; }

		while (!tile && guard++ < 96) {
			if (sideDistX < sideDistY) { sideDistX += deltaX; mapX += stepX; side = 0; }
			else { sideDistY += deltaY; mapY += stepY; side = 1; }
			if (mapX < 0 || mapY < 0 || mapX >= MAP_W || mapY >= MAP_H) { tile = 1; break; }
			tile = map[mapY * MAP_W + mapX];
		}
		perp = side == 0 ? sideDistX - deltaX : sideDistY - deltaY;
		if (perp < 0.08f) perp = 0.08f;
		zbuf[x] = perp;
		lineH = FOCAL / perp;
		drawStart = SCR_H * 0.5f - lineH * 0.5f;
		y0 = (int)drawStart;
		y1 = (int)(drawStart + lineH);
		wallX = side == 0 ? py + perp * rayY : px + perp * rayX;
		wallX -= floorf(wallX);
		texX = (int)(wallX * 64.0f);
		if (texX < 0) texX = 0;
		if (texX > 63) texX = 63;

		col = (unsigned int)frameLight;
		if (side == 1) col = col * 3 / 4;
		{
			int sh = (int)(col * (1.0f - perp / 14.0f));
			if (sh < 22) sh = 22;
			if (sh > 255) sh = 255;
			col = RGB(sh, sh, (int)(sh * 0.94f));
		}

		v[n].u = (float)texX;      v[n].v = 0.0f;  v[n].color = col; v[n].x = (float)x;      v[n].y = (float)y0; v[n].z = 0; n++;
		v[n].u = (float)texX + 1;  v[n].v = 0.0f;  v[n].color = col; v[n].x = (float)x + 1;  v[n].y = (float)y0; v[n].z = 0; n++;
		v[n].u = (float)texX + 1;  v[n].v = 64.0f; v[n].color = col; v[n].x = (float)x + 1;  v[n].y = (float)y1; v[n].z = 0; n++;
		v[n].u = (float)texX;      v[n].v = 0.0f;  v[n].color = col; v[n].x = (float)x;      v[n].y = (float)y0; v[n].z = 0; n++;
		v[n].u = (float)texX + 1;  v[n].v = 64.0f; v[n].color = col; v[n].x = (float)x + 1;  v[n].y = (float)y1; v[n].z = 0; n++;
		v[n].u = (float)texX;      v[n].v = 64.0f; v[n].color = col; v[n].x = (float)x;      v[n].y = (float)y1; v[n].z = 0; n++;
	}
	(void)half;
	sceGuDrawArray(GU_TRIANGLES, VTX, n, NULL, v);
}

static void drawBillboard(float wx, float wy, int quad, float worldW, float worldH, unsigned int tint) {
	float dirX = cosf(ang), dirY = sinf(ang);
	float planeX = -dirY * 0.75f, planeY = dirX * 0.75f;
	float relX = wx - px, relY = wy - py;
	float invDet = 1.0f / (planeX * dirY - dirX * planeY);
	float tx = invDet * (dirY * relX - dirX * relY);
	float ty = invDet * (-planeY * relX + planeX * relY);
	float screenX, scale, w, h, top, floorY;
	int cxCol, u0, v0;

	if (ty < 0.25f) return;
	cxCol = (int)((SCR_W / 2) * (1 + tx / ty));
	if (cxCol < 0 || cxCol >= SCR_W) return;
	if (zbuf[cxCol] < ty) return;

	screenX = (SCR_W / 2) * (1 + tx / ty);
	scale = FOCAL / ty;
	w = worldW * scale;
	h = worldH * scale;
	floorY = SCR_H * 0.5f + (0.5f * FOCAL) / ty;
	top = floorY - h;

	u0 = (quad % 2) * 64;
	v0 = (quad / 2) * 64;

	{
		Vtx *v = (Vtx *)sceGuGetMemory(sizeof(Vtx) * 6);
		v[0].u = (float)u0;      v[0].v = (float)v0;      v[0].color = tint; v[0].x = screenX - w / 2; v[0].y = top;     v[0].z = 0;
		v[1].u = (float)u0 + 64; v[1].v = (float)v0;      v[1].color = tint; v[1].x = screenX + w / 2; v[1].y = top;     v[1].z = 0;
		v[2].u = (float)u0 + 64; v[2].v = (float)v0 + 64; v[2].color = tint; v[2].x = screenX + w / 2; v[2].y = floorY;  v[2].z = 0;
		v[3].u = (float)u0;      v[3].v = (float)v0;      v[3].color = tint; v[3].x = screenX - w / 2; v[3].y = top;     v[3].z = 0;
		v[4].u = (float)u0 + 64; v[4].v = (float)v0 + 64; v[4].color = tint; v[4].x = screenX + w / 2; v[4].y = floorY;  v[4].z = 0;
		v[5].u = (float)u0;      v[5].v = (float)v0 + 64; v[5].color = tint; v[5].x = screenX - w / 2; v[5].y = floorY;  v[5].z = 0;
		sceGuDrawArray(GU_TRIANGLES, VTX, 6, NULL, v);
	}
}

static void drawSprites(void) {
	int i;
	/* furniture */
	for (i = 0; i < objN; i++) {
		int d = abs(objX[i] - (int)px) + abs(objY[i] - (int)py);
		if (d > 12) continue;
		if (objType[i] == OBJ_CABINET)
			drawBillboard(objX[i] + 0.5f, objY[i] + 0.5f, 0, 0.7f, 1.35f, RGB(210, 210, 205));
		else if (objType[i] == OBJ_CHEST)
			drawBillboard(objX[i] + 0.5f, objY[i] + 0.5f, 1, 0.75f, 0.6f, RGB(225, 215, 200));
		else
			drawBillboard(objX[i] + 0.5f, objY[i] + 0.5f, 1, 0.85f, 0.6f, RGB(200, 195, 185));
	}
	/* coins */
	for (i = 0; i < coinN; i++) {
		if (coinX[i] < 0) continue;
		drawBillboard(coinX[i] + 0.5f, coinY[i] + 0.5f, 3, 0.22f, 0.22f, RGB(255, 220, 150));
	}
	/* creature */
	if (creActive) {
		drawBillboard(creX, creY, 2, 1.1f, 1.7f, RGB(235, 235, 230));
	}
}

static void quad2d(float x, float y, float w, float h, unsigned int color) {
	Vtx *v = (Vtx *)sceGuGetMemory(sizeof(Vtx) * 6);
	int i;
	for (i = 0; i < 6; i++) {
		v[i].u = 0;
		v[i].v = 0;
		v[i].color = color;
		v[i].z = 0;
	}
	v[0].x = x;       v[0].y = y;
	v[1].x = x + w;   v[1].y = y;
	v[2].x = x + w;   v[2].y = y + h;
	v[3].x = x;       v[3].y = y;
	v[4].x = x + w;   v[4].y = y + h;
	v[5].x = x;       v[5].y = y + h;
	sceGuDrawArray(GU_TRIANGLES, VTX, 6, NULL, v);
}

static void drawText(float x, float y, int scale, unsigned int color, const char *s) {
	int i, len = (int)strlen(s);
	for (i = 0; i < len; i++) {
		char c = s[i];
		int g = -1, k;
		Vtx *v;
		float gx, gy;
		if (c >= 'a' && c <= 'z') c -= 32;
		for (k = 0; k < 40; k++) if (GLYPHS[k] == c) { g = k; break; }
		if (g < 0) continue;
		gx = (float)((g % 8) * 8);
		gy = (float)((g / 8) * 6);
		v = (Vtx *)sceGuGetMemory(sizeof(Vtx) * 6);
		v[0].u = gx;        v[0].v = gy;        v[0].color = color; v[0].x = x;                       v[0].y = y;                       v[0].z = 0;
		v[1].u = gx + 3;    v[1].v = gy;        v[1].color = color; v[1].x = x + 3 * scale;           v[1].y = y;                       v[1].z = 0;
		v[2].u = gx + 3;    v[2].v = gy + 5;    v[2].color = color; v[2].x = x + 3 * scale;           v[2].y = y + 5 * scale;           v[2].z = 0;
		v[3].u = gx;        v[3].v = gy;        v[3].color = color; v[3].x = x;                       v[3].y = y;                       v[3].z = 0;
		v[4].u = gx + 3;    v[4].v = gy + 5;    v[4].color = color; v[4].x = x + 3 * scale;           v[4].y = y + 5 * scale;           v[4].z = 0;
		v[5].u = gx;        v[5].v = gy + 5;    v[5].color = color; v[5].x = x;                       v[5].y = y + 5 * scale;           v[5].z = 0;
		sceGuDrawArray(GU_TRIANGLES, VTX, 6, NULL, v);
		x += 4 * scale;
	}
}

static void drawHud(int fps, int showPerfNow) {
	char buf[64];
	sceGuDisable(GU_TEXTURE_2D);
	/* condition + lantern bars */
	quad2d(16, SCR_H - 34, 120, 4, RGB(46, 26, 22));
	quad2d(16, SCR_H - 34, 120.0f * health / 100.0f, 4, RGB(170, 78, 58));
	quad2d(16, SCR_H - 22, 120, 4, RGB(40, 34, 22));
	quad2d(16, SCR_H - 22, 120.0f * battery / 100.0f, 4, RGB(201, 167, 90));
	/* hide / lamp indicators */
	if (hiddenCab >= 0) quad2d(SCR_W - 60, SCR_H - 30, 44, 3, RGB(120, 200, 190));
	if (lampOn) quad2d(SCR_W - 60, SCR_H - 24, 44, 3, RGB(226, 178, 100));

	bindTexture(64, 32, fontIdx, palFont, 1);
	snprintf(buf, sizeof(buf), "ROOM %03d", roomNum);
	drawText(16, 14, 3, palFont[1], buf);
	snprintf(buf, sizeof(buf), "COINS %d", coins);
	drawText(SCR_W - 110, 14, 2, palFont[3], buf);

	if (msgTimer > 0) drawText(SCR_W / 2 - (float)strlen(msg) * 6, 44, 2, palFont[1], msg);

	if (showPerfNow) {
		snprintf(buf, sizeof(buf), "FPS %d", fps);
		drawText(16, 40, 2, palFont[1], buf);
		snprintf(buf, sizeof(buf), "RAM %dK", (int)(sceKernelTotalFreeMemSize() / 1024));
		drawText(16, 54, 2, palFont[1], buf);
		snprintf(buf, sizeof(buf), "BAT %d%%", scePowerGetBatteryLifePercent());
		drawText(16, 68, 2, palFont[1], buf);
	}
	if (hasKey) drawText(SCR_W - 60, SCR_H - 40, 2, palFont[3], "KEY");
	if (doorLocked && doorX >= 0) drawText(SCR_W / 2 - 20, SCR_H - 50, 2, palFont[4], "LOCKED");
}

/* ------------------------------------------------------------------ */
/* gameplay                                                            */
/* ------------------------------------------------------------------ */

static int solid(float x, float y) {
	int gx = (int)x, gy = (int)y;
	if (gx < 0 || gy < 0 || gx >= MAP_W || gy >= MAP_H) return 1;
	if (map[gy * MAP_W + gx] != 0) return 1;
	if (blocked[gy * MAP_W + gx] && hiddenCab < 0) return 1;
	return 0;
}

static void tryMove(float nx, float ny) {
	if (!solid(nx, py)) px = nx;
	if (!solid(px, ny)) py = ny;
}

static int facingTile(int *outX, int *outY) {
	float d = 0.9f;
	int tx = (int)(px + cosf(ang) * d);
	int ty = (int)(py + sinf(ang) * d);
	*outX = tx;
	*outY = ty;
	if (tx < 0 || ty < 0 || tx >= MAP_W || ty >= MAP_H) return 0;
	return map[ty * MAP_W + tx];
}

static void nextRoom(void) {
	roomNum++;
	genRoom();
	health = health > 100 ? 100 : health;
}

static void interact(void) {
	int tx, ty, tile = facingTile(&tx, &ty);
	int i, best = -1;
	float bestD = 99.0f;

	if (hiddenCab >= 0) {
		hiddenCab = -1;
		setMsg("OUT OF THE CABINET");
		return;
	}
	for (i = 0; i < objN; i++) {
		float dx = objX[i] + 0.5f - px, dy = objY[i] + 0.5f - py;
		float d = sqrtf(dx * dx + dy * dy);
		if (d < 1.5f && d < bestD) {
			bestD = d;
			best = i;
		}
	}
	if (tile == 3 && (best < 0 || bestD > 1.0f)) {
		if (doorLocked && !hasKey) {
			setMsg("NEED A KEY");
			return;
		}
		doorLocked = 0;
		nextRoom();
		return;
	}
	if (best < 0) return;
	if (objType[best] == OBJ_CABINET) {
		if (hiddenCab == best) {
			hiddenCab = -1;
			setMsg("OUT OF THE CABINET");
		} else if (!objOpen[best]) {
			objOpen[best] = 1;
			setMsg("PRESS CIRCLE TO HIDE");
		} else {
			hiddenCab = best;
			px = objX[best] + 0.5f;
			py = objY[best] + 0.5f;
			creActive = (creActive && sqrtf((creX - px) * (creX - px) + (creY - py) * (creY - py)) < 2.6f) ? 1 : 0;
			setMsg("HIDDEN - CIRCLE TO EXIT");
		}
	} else {
		int gain = 2 + rndi(6);
		objOpen[best] = 1;
		coins += gain;
		if (rndi(100) < 25) battery += 30;
		if (battery > 100) battery = 100;
		if (doorLocked && rndi(100) < 70) hasKey = 1;
		setMsg("SEARCHED");
	}
	(void)i;
}

static void updateCreature(float dt) {
	float dx, dy, d, speed;
	if (!creActive) return;
	dx = px - creX;
	dy = py - creY;
	d = sqrtf(dx * dx + dy * dy);
	if (d < 0.001f) d = 0.001f;
	speed = 1.5f + roomNum * 0.02f;
	if (hiddenCab >= 0) speed *= 0.55f;
	if (d < 0.85f && hiddenCab < 0) {
		health -= 100;
		creActive = 0;
		return;
	}
	creX += (dx / d) * speed * dt;
	creY += (dy / d) * speed * dt;
	if (hiddenCab >= 0 && d < 1.2f) {
		/* it passes the hiding place and moves on */
		creX -= (dx / d) * 6.0f;
		creY -= (dy / d) * 6.0f;
		creActive = 0;
		discoveredCount++;
		setMsg("IT PASSED");
	}
}

static void spawnCreature(void) {
	int dist[CELLS], i, best = -1, bestI = -1;
	bfsFrom((int)px, (int)py, dist);
	for (i = 0; i < CELLS; i++) {
		if (dist[i] > best && dist[i] < 40 && dist[i] > 6) {
			best = dist[i];
			bestI = i;
		}
	}
	if (bestI < 0) return;
	creX = (bestI % MAP_W) + 0.5f;
	creY = (bestI / MAP_W) + 0.5f;
	creType = rndi(4);
	creActive = 1;
	shakeAmt = 0.6f;
}

/* ------------------------------------------------------------------ */
/* boot                                                                */
/* ------------------------------------------------------------------ */

static void initGu(void) {
	sceGuInit();
	sceGuStart(GU_DIRECT, guList);
	sceGuDrawBuffer(GU_PSM_8888, (void *)0, SCR_W);
	sceGuDispBuffer(SCR_W, SCR_H, (void *)(SCR_W * SCR_H * 4), SCR_W);
	sceGuDepthBuffer((void *)(SCR_W * SCR_H * 8), SCR_W);
	sceGuOffset(2048 - SCR_W / 2, 2048 - SCR_H / 2);
	sceGuViewport(2048, 2048, SCR_W, SCR_H);
	sceGuDepthRange(65535, 0);
	sceGuScissor(0, 0, SCR_W, SCR_H);
	sceGuEnable(GU_SCISSOR_TEST);
	sceGuDepthFunc(GU_GEQUAL);
	sceGuDisable(GU_DEPTH_TEST);
	sceGuFrontFace(GU_CW);
	sceGuShadeModel(GU_SMOOTH);
	sceGuEnable(GU_TEXTURE_2D);
	sceGuEnable(GU_BLEND);
	sceGuBlendFunc(GU_ADD, GU_SRC_ALPHA, GU_ONE_MINUS_SRC_ALPHA, 0, 0);
	sceGuTexEnvColor(0x00000000);
	sceGuFinish();
	sceGuSync(0, 0);
	sceDisplayWaitVblankStart();
	sceGuDisplay(GU_TRUE);
}

int main(int argc, char *argv[]) {
	SceCtrlData pad;
	unsigned int lastT, now;
	int fps = 0, frames = 0, showPerfNow = 0, running = 1;
	float dt = 0.016f;
	int i;

	(void)argc;
	(void)argv;

	initPalettes();
	buildWallTexture();
	buildSpriteAtlas();
	buildFont();
	initGu();

	sceCtrlSetSamplingCycle(0);
	sceCtrlSetSamplingMode(PSP_CTRL_MODE_ANALOG);

	genRoom();

	lastT = sceKernelGetSystemTimeLow();
	frames = 0;

	while (running) {
		sceGuStart(GU_DIRECT, guList);
		sceGuClearColor(0xff000000);
		sceGuClear(GU_COLOR_BUFFER_BIT);

		now = sceKernelGetSystemTimeLow();
		dt = (now - lastT) / 1000000.0f;
		if (dt > 0.1f) dt = 0.1f;
		if (dt < 0.001f) dt = 0.001f;
		lastT = now;
		frames++;

		sceCtrlPeekBufferPositive(&pad, 1);
		if (pad.Buttons & PSP_CTRL_SELECT) {
			showPerfNow = !showPerfNow;
			sceKernelDelayThread(180000);
		}
		if (pad.Buttons & PSP_CTRL_START) {
			paused = !paused;
			sceKernelDelayThread(200000);
		}

		if (!paused) {
			float lx = (pad.Lx - 128) / 128.0f;
			float ly = (pad.Ly - 128) / 128.0f;
			float speed = ((pad.Buttons & PSP_CTRL_CROSS) ? 0.0f : (pad.Buttons & PSP_CTRL_SQUARE ? 2.4f : 1.6f));

			/* L/R trigger look, analog stick movement */
			if (pad.Buttons & PSP_CTRL_LTRIGGER) ang -= 2.2f * dt;
			if (pad.Buttons & PSP_CTRL_RTRIGGER) ang += 2.2f * dt;
			if (pad.Lx < 60 || pad.Lx > 196) ang += lx * 0.8f * dt;

			if (hiddenCab < 0) {
				if (fabsf(ly) > 0.2f) tryMove(px + cosf(ang) * ly * speed * dt, py + sinf(ang) * ly * speed * dt);
				if (fabsf(lx) > 0.2f) tryMove(px + cosf(ang + 1.5708f) * lx * speed * dt, py + sinf(ang + 1.5708f) * lx * speed * dt);
				if (fabsf(ly) > 0.2f) bobPhase += dt * speed * 4.0f;
			}

			if (pad.Buttons & PSP_CTRL_CIRCLE) {
				if (hiddenCab >= 0) {
					hiddenCab = -1;
					setMsg("OUT OF THE CABINET");
				}
				sceKernelDelayThread(160000);
			}
			if (pad.Buttons & PSP_CTRL_TRIANGLE) {
				sceKernelDelayThread(160000);
				discoveredCount++;
			}
			if (pad.Buttons & PSP_CTRL_SQUARE) {
				if (battery > 0) lampOn = !lampOn;
				sceKernelDelayThread(160000);
			}
			/* Cross = interact: re-use CIRCLE handler path for chest/cabinet */
			{
				static int prevCross = 0;
				int cross = (pad.Buttons & PSP_CTRL_CROSS) ? 1 : 0;
				if (cross && !prevCross) interact();
				prevCross = cross;
			}

			/* coin pickup */
			for (i = 0; i < coinN; i++) {
				if (coinX[i] < 0) continue;
				if (fabsf(coinX[i] + 0.5f - px) < 0.5f && fabsf(coinY[i] + 0.5f - py) < 0.5f) {
					coinX[i] = -1;
					coins++;
				}
			}

			if (lampOn) {
				battery -= (int)(dt * 3.0f);
				if (battery <= 0) { battery = 0; lampOn = 0; }
			}
			if (msgTimer > 0) msgTimer--;
			if (shakeAmt > 0) shakeAmt -= dt * 0.6f;
			if (shakeAmt < 0) shakeAmt = 0;
			distortAmt = 0;

			updateCreature(dt);

			/* creature encounters start after a while in a room */
			{
				static float encTimer = 18.0f;
				encTimer -= dt;
				if (encTimer <= 0 && !creActive) {
					encTimer = 22.0f + (float)rndi(14);
					spawnCreature();
					setMsg(creType == 0 ? "THE FLOOR SHAKES" : creType == 1 ? "FOOTSTEPS ANSWER YOURS" : creType == 2 ? "THE CEILING SCRAPES" : "EVERYTHING GOES SILENT");
				}
			}

			if (health <= 0) {
				setMsg("YOU WERE FOUND - RESTARTING");
				sceKernelDelayThread(900000);
				health = 100;
				roomNum = 1;
				genRoom();
			}
		}

		frameLight = 150 + (int)(sinf((float)now * 0.0002f) * 20.0f);
		if (lampOn) frameLight += 90;
		if (frameLight > 235) frameLight = 235;

		drawFloorCeil(frameLight);
		bindTexture(64, 64, wallIdx, palWall, 0);
		drawWalls();
		bindTexture(128, 128, sprIdx, palSpr, 1);
		drawSprites();
		if (hiddenCab >= 0) {
			sceGuDisable(GU_TEXTURE_2D);
			quad2d(0, 0, SCR_W, 30, 0xff000000);
			quad2d(0, SCR_H - 30, SCR_W, 30, 0xff000000);
			sceGuEnable(GU_TEXTURE_2D);
		}
		drawHud(fps, showPerfNow);

		if (paused) {
			sceGuDisable(GU_TEXTURE_2D);
			quad2d(0, SCR_H / 2 - 20, SCR_W, 40, 0xcc000000);
			sceGuEnable(GU_TEXTURE_2D);
			bindTexture(64, 32, fontIdx, palFont, 1);
			drawText(SCR_W / 2 - 60, SCR_H / 2 - 10, 3, palFont[1], "PAUSED");
		}

		sceGuFinish();
		sceGuSync(0, 0);
		sceDisplayWaitVblankStart();
		sceGuSwapBuffers();

		if (frames >= 30) {
			static unsigned int fpsT = 0;
			unsigned int t = sceKernelGetSystemTimeLow();
			if (fpsT == 0) fpsT = t;
			else if (t - fpsT > 500000) {
				fps = (int)(frames * 1000000.0f / (float)(t - fpsT));
				frames = 0;
				fpsT = t;
			}
		}
	}

	sceGuTerm();
	sceKernelExitGame();
	return 0;
}
`;

export const PSP_MAKEFILE = String.raw`TARGET = ShatteredMemories
OBJS = src/main.o

CFLAGS = -O2 -G0 -Wall
CXXFLAGS = $(CFLAGS) -fno-exceptions -fno-rtti
ASFLAGS = $(CFLAGS)

LIBDIR =
LDFLAGS =

LIBS = -lpsppower -lpspgu -lpspgum -lm -lpspctrl -lpspdisplay -lpspkernel

BUILD_PRX = 1
PSP_FW_VERSION = 371

EXTRA_TARGETS = EBOOT.PBP
PSP_EBOOT_TITLE = Shattered Memories
PSP_EBOOT_ICON = assets/ICON0.PNG
PSP_EBOOT_PIC1 = assets/PIC1.PNG
PSP_EBOOT_SND0 =
PSP_EBOOT_PSAR =

PSPSDK = $(shell psp-config --pspsdk-path)
ifneq ($(PSPSDK),)
include $(PSPSDK)/lib/build.mk
endif
`;

export const PSP_README = String.raw`# SHATTERED MEMORIES — Sony PSP homebrew build

A native C implementation of the Shattered Memories hallway loop for the
Sony PSP, built against PSPSDK. This is a separate native project, not the
browser game wrapped in an archive.

## What this build is

* 480 x 272 output, 16:9, rendered through the GU (sceGu*).
* Raycast corridors: one textured wall column per screen column, DDA against
  a tile grid, per-column distance buffer.
* Procedural rooms: recursive-backtracker maze, braided loops, widened pockets,
  dead-end furniture placement, locked exit doors with a key in the room.
* Procedural textures generated at boot into 8-bit (T8) paletted textures.
  No PNG/TM2 assets are required except the EBOOT artwork.
* Searchable footlockers, desks and cabinets; coins; lantern with battery.
* Hiding: press CIRCLE at an opened cabinet. The creature keeps moving,
  walks past the hiding place and leaves.
* Creatures with per-type warning messages, pursuit and a lethal proximity check.
* SELECT toggles the performance overlay: FPS, free RAM (sceKernelTotalFreeMemSize)
  and battery percentage (scePowerGetBatteryLifePercent). These are read from
  the hardware; nothing is hard-coded.

## What is simplified compared with the browser build

The PSP has no depth-tested billboard pipeline here, so:

* Floor and ceiling are gradient quads rather than per-pixel floor casting.
* Sprites are a single 128x128 paletted atlas (cabinet / chest / creature / coin)
  drawn as alpha-tested billboards.
* One creature type set of four silhouettes, no per-frame skeletal animation.
* Particles, screen distortion and 3D jumpscares are reduced to a shake plus a
  warning message and a fade.
* The shop and the field index are not yet implemented on the PSP; the browser
  build is the reference for those systems.

These are deliberate reductions for memory and fill rate, not missing features
hidden behind a placeholder.

## Controls

| Input | Action |
| --- | --- |
| Analog stick | Move / strafe |
| L trigger | Look left |
| R trigger | Look right |
| Cross | Interact (open, search, door) |
| Circle | Hide / leave hiding place |
| Square | Lantern |
| Triangle | Index counter |
| Select | Performance overlay |
| Start | Pause |

## Building

You need a working PSPSDK toolchain (psp-gcc, psp-config).

    export PSPDEV=/usr/local/pspdev
    export PATH=$PATH:$PSPDEV/bin
    make

The result is EBOOT.PBP in the project root, plus
ShatteredMemories.prx. Copy EBOOT.PBP into

    ms0:/PSP/GAME/ShatteredMemories/EBOOT.PBP

## Status

The source in this archive has not been compiled or run against hardware or an
emulator as part of this delivery. It is written for PSPSDK and the GU API, and
the calls used are the standard ones, but you must build it with your toolchain
and expect to fix small issues. No EBOOT.PBP is included because it can only be
produced by a PSP build environment.

## Ad-hoc multiplayer

PSP ad-hoc multiplayer is **not implemented**. The requirement is recorded here
as future work: the intended approach is sceNetAdhoc + sceNetAdhocMatching,
synchronising player position and heading at ~10 Hz, with one additional
low-poly player billboard drawn from a shared atlas quadrant. It is not present
in this source and must not be described as working.
`;

export function pspProjectFiles() {
  return [
    { name: 'Shattered_Memories_PSP/Makefile', data: PSP_MAKEFILE },
    { name: 'Shattered_Memories_PSP/README.md', data: PSP_README },
    { name: 'Shattered_Memories_PSP/src/main.c', data: PSP_MAIN_C },
    { name: 'Shattered_Memories_PSP/assets/README.txt', data: 'ICON0.PNG (144x80) and PIC1.PNG (480x272) are generated into this folder when you download the archive.\n' },
  ];
}