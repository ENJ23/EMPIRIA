import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';

interface Slide {
    image: string;
    title: string;
    subtitle: string;
}

@Component({
    selector: 'app-hero-slider',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './hero-slider.component.html',
    styleUrl: './hero-slider.component.css'
})
export class HeroSliderComponent implements OnInit, OnDestroy {
    slides: Slide[] = [
        {
            image: 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=1600&q=80',
            title: 'Neon Nights',
            subtitle: 'Vive la música electrónica como nunca antes en el corazón de Jujuy.'
        },
        {
            image: 'https://images.unsplash.com/photo-1540039155733-5bb30b53aa14?w=1600&q=80',
            title: 'Conciertos VIP',
            subtitle: 'Experiencias exclusivas con tus artistas favoritos.'
        },
        {
            image: 'https://images.unsplash.com/photo-1514525253440-b393452e8d26?w=1600&q=80',
            title: 'Arte & Cultura',
            subtitle: 'Eventos que despiertan todos tus sentidos.'
        }
    ];

    currentSlide = 0;
    private intervalId: any;

    ngOnInit() {
        this.startAutoSlide();
    }

    ngOnDestroy() {
        this.stopAutoSlide();
    }

    startAutoSlide() {
        this.intervalId = setInterval(() => {
            this.nextSlide();
        }, 5000);
    }

    stopAutoSlide() {
        if (this.intervalId) {
            clearInterval(this.intervalId);
        }
    }

    nextSlide() {
        this.currentSlide = (this.currentSlide + 1) % this.slides.length;
    }

    prevSlide() {
        this.currentSlide = (this.currentSlide - 1 + this.slides.length) % this.slides.length;
    }

    goToSlide(index: number) {
        this.currentSlide = index;
        this.stopAutoSlide(); // Reset timer on manual interaction
        this.startAutoSlide();
    }
}
