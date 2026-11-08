import { useQuery } from "@tanstack/react-query";
import { MessageSquarePlus, RefreshCw, Sparkles, Star } from "lucide-react";
import { useEffect } from "react";
import { Link, useParams } from "react-router-dom";

import { GlassPanel } from "@/components/glass/Glass";
import { Button } from "@/components/ui/Button";
import { EmptyState, ErrorState } from "@/components/ui/States";
import { api, unwrap } from "@/lib/api/client";
import { ApiError, userMessage } from "@/lib/api/errors";
import { qk } from "@/lib/api/query-keys";
import { useAuth } from "@/lib/auth/auth-context";

import { SkillCard, SkillCardSkeleton } from "./SkillCard";

/** /u/:login — the shareable card. What's around it depends on who's looking. */
export function PublicCardPage() {
  const { login = "" } = useParams();
  const { user } = useAuth();
  const card = useQuery({
    queryKey: qk.card(login),
    queryFn: () =>
      unwrap(api.GET("/api/v1/cards/{github_login}", { params: { path: { github_login: login } } })),
  });

  useEffect(() => {
    const name = card.data?.profile.name || login;
    document.title = card.data
      ? `${name} · Signal Score ${card.data.signalScore} · SkillProof`
      : "Skill card · SkillProof";
    document
      .querySelector('meta[name="description"]')
      ?.setAttribute(
        "content",
        card.data
          ? `${name}'s proven skills from public GitHub work: Signal Score ${card.data.signalScore}/100.`
          : "A SkillProof skill card.",
      );
  }, [card.data, login]);

  const isOwner = user?.github?.login?.toLowerCase() === login.toLowerCase();
  const isRecruiter = user?.role === "recruiter" && user.recruiterProfile?.approvalStatus === "approved";

  const aside = isOwner ? (
    <Link to="/app/analyse">
      <Button className="w-full">
        <RefreshCw aria-hidden className="h-4 w-4" /> Run again
      </Button>
    </Link>
  ) : isRecruiter ? (
    <div className="space-y-2">
      <Link to={`/recruiter/candidates/${login}`}>
        <Button className="w-full">
          <Star aria-hidden className="h-4 w-4" /> Shortlist
        </Button>
      </Link>
      <Link to={`/recruiter/candidates/${login}#feedback`}>
        <Button variant="glass" className="mt-2 w-full">
          <MessageSquarePlus aria-hidden className="h-4 w-4" /> Send feedback
        </Button>
      </Link>
    </div>
  ) : !user ? (
    <Link to="/register?role=job_seeker">
      <Button variant="hero" className="w-full">
        <Sparkles aria-hidden className="h-4 w-4" /> Get your own card
      </Button>
    </Link>
  ) : null;

  return (
    <div className="mx-auto max-w-6xl px-4 pb-20 pt-28">
      {card.isPending ? (
        <SkillCardSkeleton />
      ) : card.isError ? (
        card.error instanceof ApiError && card.error.status === 404 ? (
          <GlassPanel>
            <EmptyState
              title={`No skill card for @${login} yet`}
              description="Either this GitHub account hasn't been analysed, or the link is mistyped."
              action={
                <Link to="/register?role=job_seeker">
                  <Button>Get your own card</Button>
                </Link>
              }
            />
          </GlassPanel>
        ) : (
          <GlassPanel>
            <ErrorState
              description={userMessage(card.error)}
              onRetry={() => card.refetch()}
              requestId={card.error instanceof ApiError ? card.error.requestId : undefined}
            />
          </GlassPanel>
        )
      ) : (
        <SkillCard card={card.data} aside={aside} />
      )}
    </div>
  );
}
