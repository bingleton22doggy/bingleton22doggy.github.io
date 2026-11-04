TARGET = ShatteredMemories
OBJS = src/main.o

CFLAGS = -O2 -G0 -Wall
CXXFLAGS = $(CFLAGS) -fno-exceptions -fno-rtti
ASFLAGS = $(CFLAGS)

LIBDIR =
LDFLAGS =

LIBS = -lpsppower -lpspaudio -lpspgu -lpspgum -lm -lpspctrl -lpspdisplay -lpspkernel

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
